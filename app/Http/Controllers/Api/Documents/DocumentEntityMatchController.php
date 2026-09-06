<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentEntityMatchResource;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\DocumentEntityMatch;
use App\Models\DocumentUpload;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\BranchScopeService;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentEntityMatcher;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentTransactionProposalService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
        if (! $doc->extraction || ! is_array($doc->extraction->normalized_json)) {
            return response()->json(['ok' => false, 'message' => 'No extraction available.', 'code' => 'NO_EXTRACTION'], 422);
        }
        $matches = $this->matcher->matchAll($doc, $doc->extraction->normalized_json);

        return response()->json(['ok' => true, 'matches' => DocumentEntityMatchResource::collection($matches)]);
    }

    public function chooseMatch(Request $request, string $matchId)
    {
        $this->perms->authorize($request->user(), 'document_upload.entity_match');
        $match = DocumentEntityMatch::findOrFail($matchId);
        $this->assertDocumentAccess($request, $match->documentUpload()->firstOrFail());
        $data = $request->validate([
            'matched_id' => ['required', 'uuid'],
        ]);

        $allowedIds = collect($match->options['suggestions'] ?? [])->pluck('id')->map(fn ($id) => (string) $id);
        if (! $allowedIds->contains((string) $data['matched_id'])) {
            throw ValidationException::withMessages([
                'matched_id' => 'Choose one of the current matching suggestions. Run matching again to refresh the list.',
            ]);
        }

        $matchedModel = $this->modelFor($match->entity_type);
        if (! $matchedModel || ! $matchedModel::query()->whereKey($data['matched_id'])->exists()) {
            throw ValidationException::withMessages(['matched_id' => 'The selected ERP record is no longer available.']);
        }

        $match->update([
            'matched_id' => $data['matched_id'],
            'matched_model' => $matchedModel,
            'match_status' => 'user_selected',
        ]);

        $this->refreshOpenProposals($match->document_upload_id);

        return response()->json(['ok' => true, 'match' => new DocumentEntityMatchResource($match->fresh())]);
    }

    /**
     * Links a match to an ERP record, creating it only if it does not exist.
     *
     * One call for what used to be two decisions ("is it in the catalogue?"
     * and then "create it"), so the reviewer picks a record or types a name
     * and is done. A name already in the catalogue is reused rather than
     * duplicated, which is the point of doing this per line: the same item on
     * three lines must not become three products.
     */
    public function link(Request $request, string $matchId)
    {
        $this->perms->authorize($request->user(), 'document_upload.entity_match');

        $match = DocumentEntityMatch::findOrFail($matchId);
        $doc = $match->documentUpload()->firstOrFail();
        $this->assertDocumentAccess($request, $doc);

        $data = $request->validate([
            'matched_id' => ['nullable', 'uuid'],
            'name' => ['nullable', 'string', 'max:255'],
            'product_type' => ['nullable', 'string', 'in:simple,service'],
        ]);

        $model = $this->modelFor($match->entity_type);

        if (! $model) {
            throw ValidationException::withMessages([
                'matched_id' => 'This record type cannot be linked from the review screen.',
            ]);
        }

        if (filled($data['matched_id'] ?? null)) {
            if (! $model::query()->whereKey($data['matched_id'])->exists()) {
                throw ValidationException::withMessages([
                    'matched_id' => 'The selected ERP record is no longer available.',
                ]);
            }

            $this->linkMatch($match, $model, $data['matched_id'], 'user_selected');

            return response()->json([
                'ok' => true,
                'created' => false,
                'match' => new DocumentEntityMatchResource($match->fresh()),
            ]);
        }

        $name = trim((string) ($data['name'] ?? '')) ?: (string) $match->extracted_name;

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Enter a name, or choose an existing record.']);
        }

        // "Get": an existing record with this name is linked as though the
        // reviewer had picked it from the list.
        $existing = $this->findByName($model, $match->entity_type, $name);

        if ($existing) {
            $this->linkMatch($match, $model, (string) $existing->id, 'user_selected');

            return response()->json([
                'ok' => true,
                'created' => false,
                'match' => new DocumentEntityMatchResource($match->fresh()),
                'record' => ['label' => $existing->name ?? $existing->code ?? $name],
            ]);
        }

        // "Or create": creating a record is a separate, higher permission.
        $this->perms->authorize($request->user(), 'document_upload.create_fk');

        $created = $this->createEntityRecord($match, [
            'name' => $name,
            'code' => $name,
            'product_type' => $data['product_type'] ?? null,
        ]);

        $match->update([
            'matched_id' => $created->id,
            'matched_model' => get_class($created),
            'match_status' => 'created',
            'created_record_id' => $created->id,
        ]);

        $this->refreshOpenProposals($match->document_upload_id);

        $this->audit->log('fk.created', [
            'document_upload_id' => $match->document_upload_id,
            'entity_type' => $match->entity_type,
            'record_id' => $created->id,
        ]);

        return response()->json([
            'ok' => true,
            'created' => true,
            'match' => new DocumentEntityMatchResource($match->fresh()),
            'record' => ['label' => $created->name ?? $created->code ?? $name],
        ]);
    }

    /**
     * Records of one entity type, for the line-level picker.
     *
     * Gated by the document permission rather than the catalogue's own, so
     * reviewing a document never requires handing out product administration.
     */
    public function search(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.entity_match');
        $doc = $this->findDocument($publicId);
        $this->assertDocumentAccess($request, $doc);

        $data = $request->validate([
            'type' => ['required', 'string'],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $model = $this->modelFor($data['type']);

        if (! $model) {
            throw ValidationException::withMessages(['type' => 'That record type cannot be searched.']);
        }

        $term = trim((string) ($data['q'] ?? ''));
        $isCurrency = $data['type'] === 'currency';

        $records = $model::query()
            ->when($term !== '', function ($query) use ($term, $isCurrency) {
                $query->where(function ($inner) use ($term, $isCurrency) {
                    $inner->where('name', 'like', '%'.$term.'%');
                    if ($isCurrency) {
                        $inner->orWhere('code', 'like', $term.'%');
                    }
                });
            })
            ->when(in_array($data['type'], ['customer', 'supplier'], true), fn ($query) => $query->where(
                'contact_type',
                $data['type'] === 'supplier' ? 'Supplier' : 'Customer',
            ))
            ->orderBy('name')
            ->limit(25)
            ->get();

        return response()->json([
            'ok' => true,
            'results' => $records->map(fn ($record) => [
                'id' => $record->id,
                'name' => $record->name ?? $record->code,
                'code' => $record->code ?? $record->sku ?? null,
            ])->values(),
        ]);
    }

    /** Points a match at an existing record and refreshes any open proposal. */
    private function linkMatch(DocumentEntityMatch $match, string $model, string $recordId, string $status): void
    {
        $match->update([
            'matched_id' => $recordId,
            'matched_model' => $model,
            'match_status' => $status,
        ]);

        $this->refreshOpenProposals($match->document_upload_id);
    }

    /** Exact, case-insensitive name lookup: the "get" half of get-or-create. */
    private function findByName(string $model, string $entityType, string $name)
    {
        $column = $entityType === 'currency' ? 'code' : 'name';
        $value = $entityType === 'currency' ? strtoupper($name) : $name;

        return $model::query()
            ->whereRaw('LOWER('.$column.') = ?', [mb_strtolower($value)])
            ->when(in_array($entityType, ['customer', 'supplier'], true), fn ($query) => $query->where(
                'contact_type',
                $entityType === 'supplier' ? 'Supplier' : 'Customer',
            ))
            ->first();
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
            'fields.name' => ['nullable', 'string', 'max:255'],
            'fields.email' => ['nullable', 'email', 'max:255'],
            'fields.phone' => ['nullable', 'string', 'max:50'],
            'fields.address' => ['nullable', 'string', 'max:1000'],
            'fields.tax_registration_no' => ['nullable', 'string', 'max:100'],
            'fields.tax_number' => ['nullable', 'string', 'max:100'],
            'fields.sku' => ['nullable', 'string', 'max:100'],
            'fields.description' => ['nullable', 'string', 'max:1000'],
            'fields.code' => ['nullable', 'string', 'max:20'],
            'fields.product_type' => ['nullable', 'string', 'in:simple,service'],
        ]);

        $match = DocumentEntityMatch::where('id', $data['match_id'])
            ->where('document_upload_id', $doc->id)
            ->firstOrFail();

        $fields = $data['fields'] ?? [];
        if (! in_array($match->entity_type, ['customer', 'supplier', 'product', 'currency', 'warehouse'], true)) {
            throw ValidationException::withMessages([
                'match_id' => 'This ERP record type must be selected from an existing record.',
            ]);
        }
        $created = $this->createEntityRecord($match, $fields);

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

        return response()->json([
            'ok' => true,
            'match' => new DocumentEntityMatchResource($match->fresh()),
            'record' => ['label' => $created->name ?? $created->code ?? $match->extracted_name],
        ]);
    }

    /**
     * Creates the ERP record a match points at.
     *
     * Shared by the matches table's "create missing record" action and by the
     * line-level product picker, so a product created from a line is created
     * exactly the same way -- same defaults, same system-generated flag.
     */
    private function createEntityRecord(DocumentEntityMatch $match, array $fields)
    {
        return match ($match->entity_type) {
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
                // A product created from a document line has no opening stock,
                // cost or valuation behind it, so it is created as a service
                // unless the reviewer says it is a stocked item. Creating it as
                // tracked stock would let the draft move inventory that was
                // never received.
                'product_type' => ($fields['product_type'] ?? 'service') === 'simple' ? 'simple' : 'service',
                'track_inventory' => ($fields['product_type'] ?? 'service') === 'simple',
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
            default => throw new \RuntimeException('Cannot auto-create FK of type: '.$match->entity_type),
        };
    }

    /** The ERP model a match of this type may point at. */
    private function modelFor(string $entityType): ?string
    {
        return match ($entityType) {
            'customer', 'supplier' => Contact::class,
            'product' => Product::class,
            'account' => Account::class,
            'bank_account' => BankAccount::class,
            'currency' => Currency::class,
            'warehouse' => Warehouse::class,
            default => null,
        };
    }

    private function refreshOpenProposals(string $documentUploadId): void
    {
        $doc = DocumentUpload::with('proposals')->find($documentUploadId);
        if (! $doc) {
            return;
        }

        foreach ($doc->proposals as $proposal) {
            if ($proposal->status === 'converted') {
                continue;
            }
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
