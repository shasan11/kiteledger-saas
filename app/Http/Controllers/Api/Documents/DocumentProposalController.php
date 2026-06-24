<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentExtractionResource;
use App\Http\Resources\DocumentUploadResource;
use App\Models\DocumentTransactionProposal;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentDuplicateChecker;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentReviewSchemaBuilder;
use App\Services\Documents\DocumentTransactionConverter;
use App\Services\Documents\DocumentTransactionPayloadValidator;
use App\Services\Documents\DocumentTransactionProposalService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;

class DocumentProposalController extends Controller
{
    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentTransactionProposalService $proposalService,
        protected DocumentTransactionConverter $converter,
        protected DocumentDuplicateChecker $duplicates,
        protected DocumentAuditService $audit,
        protected DocumentReviewSchemaBuilder $schemaBuilder,
        protected DocumentTransactionPayloadValidator $validator,
        protected BranchScopeService $branchScope,
    ) {}

    public function index(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');
        $doc = $this->findDocument($publicId);
        $this->assertDocumentAccess($request, $doc);
        return response()->json(['ok' => true, 'proposals' => $doc->proposals()->latest()->get()]);
    }

    public function store(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.proposal.create');

        $doc = $this->findDocument($publicId, ['extraction']);
        $this->assertDocumentAccess($request, $doc);

        $data = $request->validate([
            'transaction_type' => ['required', 'string', 'in:' . implode(',', DocumentTransactionProposalService::SUPPORTED_TYPES)],
            'payload' => ['nullable', 'array'],
        ]);

        $normalized = $doc->extraction?->normalized_json ?? [];
        $review = $this->proposalService->buildReview(
            $doc,
            $data['transaction_type'],
            $normalized,
            $data['payload'] ?? [],
        );

        $proposal = $this->proposalService->create(
            $doc,
            $data['transaction_type'],
            $review['mapped_payload'],
            $review['warnings'],
            $doc->extraction?->id,
        );

        $this->audit->log('proposal.created', [
            'document_upload_id' => $doc->id,
            'proposal_id' => $proposal->id,
            'transaction_type' => $proposal->transaction_type,
        ]);

        return response()->json($this->reviewPayload($doc, $proposal->fresh()));
    }

    public function review(Request $request, string $publicId, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');

        $doc = $this->findDocument($publicId, ['extraction']);
        $this->assertDocumentAccess($request, $doc);
        $proposal = DocumentTransactionProposal::where('document_upload_id', $doc->id)
            ->where('id', $proposalId)
            ->firstOrFail();

        return response()->json($this->reviewPayload($doc, $proposal));
    }

    public function saveReview(Request $request, string $publicId, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.proposal.update');

        $doc = $this->findDocument($publicId, ['extraction']);
        $this->assertDocumentAccess($request, $doc);
        $proposal = DocumentTransactionProposal::where('document_upload_id', $doc->id)
            ->where('id', $proposalId)
            ->firstOrFail();

        $data = $request->validate([
            'review_values' => ['nullable', 'array'],
            'payload' => ['nullable', 'array'],
        ]);

        $reviewValues = $data['review_values'] ?? $data['payload'] ?? [];
        $review = $this->proposalService->buildReview(
            $doc,
            $proposal->transaction_type,
            $doc->extraction?->normalized_json ?? [],
            $reviewValues,
        );

        $proposal = $this->proposalService->update(
            $proposal,
            $review['mapped_payload'],
            $review['warnings'],
        );

        return response()->json($this->reviewPayload($doc, $proposal));
    }

    public function update(Request $request, string $publicId, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.proposal.update');
        $doc = $this->findDocument($publicId, ['extraction']);
        $proposal = DocumentTransactionProposal::where('document_upload_id', $doc->id)
            ->where('id', $proposalId)->firstOrFail();
        $this->assertDocumentAccess($request, $doc);
        $data = $request->validate([
            'payload' => ['required', 'array'],
            'warnings' => ['nullable', 'array'],
        ]);
        $review = $this->proposalService->buildReview(
            $doc,
            $proposal->transaction_type,
            $doc->extraction?->normalized_json ?? [],
            $data['payload'],
        );
        $proposal = $this->proposalService->update($proposal, $review['mapped_payload'], $data['warnings'] ?? $review['warnings']);
        return response()->json(['ok' => true, 'proposal' => $proposal]);
    }

    public function convert(Request $request, string $publicId, string $proposalId)
    {
        $this->perms->authorize($request->user(), 'document_upload.convert');
        $doc = $this->findDocument($publicId);
        $proposal = DocumentTransactionProposal::where('document_upload_id', $doc->id)
            ->where('id', $proposalId)->firstOrFail();

        $this->assertDocumentAccess($request, $doc);
        $validation = $this->validator->validateForConversion($proposal->transaction_type, $proposal->payload ?? []);

        if (!$validation['ok']) {
            $schema = $this->schemaBuilder->build($proposal->transaction_type, $proposal->payload ?? [], $validation['missing_fields']);
            $proposal->update([
                'missing_fields' => $validation['missing_fields'],
                'status' => 'needs_review',
            ]);

            return response()->json([
                'ok' => false,
                'code' => 'DOCUMENT_REVIEW_REQUIRED',
                'message' => 'Some required fields are missing.',
                'missing_fields' => $validation['missing_fields'],
                'review_schema' => $schema,
                'errors' => $validation['errors'],
            ], 422);
        }

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
            report($e);
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

    private function reviewPayload(DocumentUpload $doc, DocumentTransactionProposal $proposal): array
    {
        $normalized = $doc->extraction?->normalized_json ?? [];
        $review = $this->proposalService->buildReview(
            $doc,
            $proposal->transaction_type,
            $normalized,
            $proposal->payload ?? [],
        );

        $proposal = $this->proposalService->update($proposal, $review['mapped_payload'], $review['warnings']);

        return [
            'ok' => true,
            'document' => new DocumentUploadResource($doc->fresh(['extraction'])),
            'extraction' => $doc->extraction ? new DocumentExtractionResource($doc->extraction->load('documentUpload')) : null,
            'proposal' => $proposal,
            'transaction_type' => $proposal->transaction_type,
            'initial_values' => $review['initial_values'],
            'mapped_payload' => $review['mapped_payload'],
            'missing_fields' => $review['missing_fields'],
            'warnings' => $review['warnings'],
            'confidence' => $review['confidence'],
            'review_schema' => $review['review_schema'],
            'can_convert' => empty($review['missing_fields']),
        ];
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
