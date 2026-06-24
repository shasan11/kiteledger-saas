<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentEntityMatch;
use App\Models\DocumentUpload;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentEntityMatcher;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentTransactionProposalService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;

class DocumentEntityMatchController extends Controller
{
    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentEntityMatcher $matcher,
        protected DocumentAuditService $audit,
        protected DocumentTransactionProposalService $proposalService,
        protected BranchScopeService $branchScope,
    ) {}

    public function match(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.entity_match');
        $doc = $this->findDocument($publicId, ['extraction']);
        $this->assertDocumentAccess($request, $doc);
        if (!$doc->extraction || !is_array($doc->extraction->normalized_json)) {
            return response()->json(['ok' => false, 'message' => 'No extraction available.', 'code' => 'NO_EXTRACTION'], 422);
        }
        $matches = $this->matcher->matchAll($doc, $doc->extraction->normalized_json);
        return response()->json(['ok' => true, 'matches' => $matches]);
    }

    public function chooseMatch(Request $request, string $matchId)
    {
        $this->perms->authorize($request->user(), 'document_upload.entity_match');
        $match = DocumentEntityMatch::findOrFail($matchId);
        $this->assertDocumentAccess($request, $match->documentUpload()->firstOrFail());
        $data = $request->validate([
            'matched_id' => ['required', 'uuid'],
            'matched_model' => ['nullable', 'string'],
        ]);
        $match->update([
            'matched_id' => $data['matched_id'],
            'matched_model' => $data['matched_model'] ?? $match->matched_model,
            'match_status' => 'user_selected',
        ]);

        $this->refreshOpenProposals($match->document_upload_id);

        return response()->json(['ok' => true, 'match' => $match->fresh()]);
    }

    /**
     * Create missing FK record (contact, product, currency, warehouse) after user approval.
     */
    public function createFk(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.create_fk');
        $doc = $this->findDocument($publicId);
        $this->assertDocumentAccess($request, $doc);

        $data = $request->validate([
            'match_id' => ['required', 'uuid'],
            'fields' => ['nullable', 'array'],
        ]);

        $match = DocumentEntityMatch::where('id', $data['match_id'])
            ->where('document_upload_id', $doc->id)
            ->firstOrFail();

        $fields = $data['fields'] ?? [];
        $created = match ($match->entity_type) {
            'customer' => Contact::create([
                'name' => $fields['name'] ?? $match->extracted_name,
                'contact_type' => 'Customer',
                'email' => $fields['email'] ?? null,
                'phone' => $fields['phone'] ?? null,
                'address' => $fields['address'] ?? null,
                'tax_registration_no' => $fields['tax_registration_no'] ?? $fields['tax_number'] ?? null,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => auth()->id(),
            ]),
            'supplier' => Contact::create([
                'name' => $fields['name'] ?? $match->extracted_name,
                'contact_type' => 'Supplier',
                'email' => $fields['email'] ?? null,
                'phone' => $fields['phone'] ?? null,
                'address' => $fields['address'] ?? null,
                'tax_registration_no' => $fields['tax_registration_no'] ?? $fields['tax_number'] ?? null,
                'accept_purchase' => true,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => auth()->id(),
            ]),
            'product' => Product::create([
                'name' => $fields['name'] ?? $match->extracted_name,
                'sku' => $fields['sku'] ?? null,
                'description' => $fields['description'] ?? null,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => auth()->id(),
            ]),
            'currency' => Currency::create([
                'code' => strtoupper($fields['code'] ?? $match->extracted_name),
                'name' => $fields['name'] ?? $match->extracted_name,
            ]),
            'warehouse' => Warehouse::create([
                'name' => $fields['name'] ?? $match->extracted_name,
                'active' => true,
            ]),
            default => throw new \RuntimeException('Cannot auto-create FK of type: ' . $match->entity_type),
        };

        $match->update([
            'matched_id' => $created->id,
            'matched_model' => get_class($created),
            'match_status' => 'created',
            'created_record_id' => $created->id,
        ]);

        $this->refreshOpenProposals($doc->id);

        $this->audit->log('fk.created', [
            'document_upload_id' => $doc->id,
            'entity_type' => $match->entity_type,
            'record_id' => $created->id,
        ]);

        return response()->json(['ok' => true, 'match' => $match->fresh(), 'record' => $created]);
    }

    private function refreshOpenProposals(string $documentUploadId): void
    {
        $doc = DocumentUpload::with('proposals')->find($documentUploadId);
        if (!$doc) return;

        foreach ($doc->proposals as $proposal) {
            if ($proposal->status === 'converted') continue;
            $this->proposalService->refreshProposalMatches($proposal);
        }
    }

    private function findDocument(string $publicId, array $with = []): DocumentUpload
    {
        return DocumentUpload::query()
            ->with($with)
            ->where('public_id', $publicId)
            ->firstOrFail();
    }

    private function assertDocumentAccess(Request $request, DocumentUpload $doc): void
    {
        if ($doc->branch_id) {
            $this->branchScope->assertCanAccessBranch($request->user(), (string) $doc->branch_id);
            $selected = $this->branchScope->selectedBranchId($request, $request->user());
            abort_if($selected && (string) $selected !== (string) $doc->branch_id, 403);
        }
    }
}
