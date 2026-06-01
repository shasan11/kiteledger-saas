<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Models\DocumentTransactionProposal;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentDuplicateChecker;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentTransactionConverter;
use App\Services\Documents\DocumentTransactionProposalService;
use Illuminate\Http\Request;

class DocumentProposalController extends Controller
{
    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentTransactionProposalService $proposalService,
        protected DocumentTransactionConverter $converter,
        protected DocumentDuplicateChecker $duplicates,
        protected DocumentAuditService $audit,
    ) {}

    public function index(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');
        $doc = DocumentUpload::findOrFail($id);
        return response()->json(['ok' => true, 'proposals' => $doc->proposals()->latest()->get()]);
    }

    public function store(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.proposal.create');

        $doc = DocumentUpload::with('extraction')->findOrFail($id);

        $data = $request->validate([
            'transaction_type' => ['required', 'string', 'in:' . implode(',', DocumentTransactionProposalService::SUPPORTED_TYPES)],
            'payload' => ['nullable', 'array'],
        ]);

        $normalized = $doc->extraction?->normalized_json ?? [];
        $payload = $data['payload'] ?? $this->proposalService->buildPayload($doc, $data['transaction_type'], $normalized);

        $proposal = $this->proposalService->create(
            $doc,
            $data['transaction_type'],
            $payload,
            $normalized['warnings'] ?? [],
            $doc->extraction?->id,
        );

        $this->audit->log('proposal.created', [
            'document_upload_id' => $doc->id,
            'proposal_id' => $proposal->id,
            'transaction_type' => $proposal->transaction_type,
        ]);

        return response()->json(['ok' => true, 'proposal' => $proposal->fresh()]);
    }

    public function update(Request $request, string $id, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.proposal.update');
        $proposal = DocumentTransactionProposal::where('document_upload_id', $id)
            ->where('id', $proposalId)->firstOrFail();
        $data = $request->validate([
            'payload' => ['required', 'array'],
            'warnings' => ['nullable', 'array'],
        ]);
        $proposal = $this->proposalService->update($proposal, $data['payload'], $data['warnings'] ?? []);
        return response()->json(['ok' => true, 'proposal' => $proposal]);
    }

    public function convert(Request $request, string $id, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.convert');
        $proposal = DocumentTransactionProposal::where('document_upload_id', $id)
            ->where('id', $proposalId)->firstOrFail();

        $doc = $proposal->documentUpload;
        $duplicates = $this->duplicates->check($proposal->transaction_type, $proposal->payload ?? [], $doc->file_hash);

        $override = $request->boolean('override_duplicate');
        if ($duplicates && !$override) {
            return response()->json([
                'ok' => false,
                'message' => 'Possible duplicate transaction detected.',
                'code' => 'DOCUMENT_DUPLICATE_DETECTED',
                'duplicates' => $duplicates,
            ], 409);
        }
        if ($duplicates && $override) {
            $this->perms->authorize($request->user(), 'document_upload.duplicate_override');
        }

        try {
            $result = $this->converter->convert($proposal);
        } catch (\Throwable $e) {
            $proposal->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => 'DOCUMENT_CONVERT_FAILED',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Draft ' . str_replace('_', ' ', $proposal->transaction_type) . ' created.',
            'transaction_type' => $proposal->transaction_type,
            'record_id' => $result['record_id'],
            'open_url' => $result['open_url'],
            'proposal' => $proposal->fresh(),
        ]);
    }
}
