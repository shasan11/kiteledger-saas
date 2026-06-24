<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentStorageService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DocumentUploadController extends Controller
{
    public function __construct(
        protected DocumentPermissionService $perms,
        protected DocumentStorageService $storage,
        protected DocumentAuditService $audit,
        protected BranchScopeService $branchScope,
    ) {}

    public function index(Request $request)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');

        $q = DocumentUpload::query()
            ->with(['extraction', 'uploader:id,name'])
            ->withCount('proposals')
            ->latest();

        $this->applyDocumentScope($q, $request);

        if ($search = $request->get('search')) {
            $q->where(function ($q) use ($search) {
                $q->where('label', 'like', "%{$search}%")
                  ->orWhere('original_file_name', 'like', "%{$search}%");
            });
        }
        if ($status = $request->get('status')) $q->where('status', $status);
        if ($type = $request->get('document_type')) $q->where('document_type', $type);
        if ($dateFrom = $request->get('date_from')) $q->whereDate('created_at', '>=', $dateFrom);
        if ($dateTo = $request->get('date_to')) $q->whereDate('created_at', '<=', $dateTo);
        $perPage = min((int) $request->get('per_page', 20), 100);
        return response()->json($q->paginate($perPage));
    }

    public function store(Request $request)
    {
        $this->perms->authorize($request->user(), 'document_upload.create');

        $maxKb = max(1, (int) config('documents.max_upload_mb', 10)) * 1024;
        $validator = Validator::make($request->all(), [
            'label' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:' . $maxKb, 'mimes:pdf,docx,jpg,jpeg,png,webp'],
            'document_type' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string'],
            'branch_id' => ['nullable', 'uuid'],
            'fiscal_year_id' => ['nullable', 'uuid'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => 'The uploaded document is invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $stored = $this->storage->store($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => 'DOCUMENT_UPLOAD_FAILED',
            ], 422);
        }

        $selectedBranchId = $this->branchScope->selectedBranchId($request, $request->user());
        $branchId = $request->input('branch_id') ?: $selectedBranchId;

        if ($branchId) {
            $this->branchScope->assertCanAccessBranch($request->user(), (string) $branchId);
            abort_if(
                $selectedBranchId && (string) $selectedBranchId !== (string) $branchId,
                403,
                'Select the target branch before uploading this document.'
            );
        }

        $doc = DocumentUpload::create([
            'label' => $request->string('label'),
            'document_type' => $request->string('document_type', 'unknown') ?: 'unknown',
            'notes' => $request->string('notes'),
            'branch_id' => $branchId,
            'fiscal_year_id' => $request->input('fiscal_year_id'),
            'uploaded_by' => $request->user()->id ?? null,
            'status' => 'uploaded',
            ...$stored,
        ]);

        $this->audit->log('document.uploaded', ['document_upload_id' => $doc->id, 'label' => $doc->label]);

        return response()->json(['ok' => true, 'document' => $doc->fresh()]);
    }

    public function show(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');
        $doc = DocumentUpload::query()
            ->with(['extraction', 'entityMatches', 'proposals', 'uploader:id,name'])
            ->findOrFail($id);
        $this->assertDocumentAccess($request, $doc);
        return response()->json([
            'ok' => true,
            'document' => $doc,
            'preview_url' => route('api.document-uploads.preview', ['id' => $doc->id]),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.update');
        $doc = DocumentUpload::findOrFail($id);
        $this->assertDocumentAccess($request, $doc);
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'document_type' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string'],
        ]);
        $doc->update(array_filter($data, fn ($v) => $v !== null));
        return response()->json(['ok' => true, 'document' => $doc->fresh()]);
    }

    public function destroy(Request $request, string $id)
    {
        $doc = DocumentUpload::findOrFail($id);
        $this->assertDocumentAccess($request, $doc);
        $hasConverted = $doc->proposals()->where('status', 'converted')->exists();

        if ($hasConverted) {
            $this->perms->authorize($request->user(), 'document_upload.archive');
            $doc->update(['status' => 'archived']);
            $this->audit->log('document.archived', ['document_upload_id' => $doc->id]);
            return response()->json(['ok' => true, 'message' => 'Document archived (linked transactions exist).']);
        }

        $this->perms->authorize($request->user(), 'document_upload.delete');
        $this->storage->delete($doc);
        $doc->delete();
        $this->audit->log('document.deleted', ['document_upload_id' => $id]);
        return response()->json(['ok' => true]);
    }

    public function preview(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.view');
        $doc = DocumentUpload::findOrFail($id);
        $this->assertDocumentAccess($request, $doc);
        return $this->storage->streamResponse($doc);
    }

    public function archive(Request $request, string $id)
    {
        $this->perms->authorize($request->user(), 'document_upload.archive');
        $doc = DocumentUpload::findOrFail($id);
        $this->assertDocumentAccess($request, $doc);
        $doc->update(['status' => 'archived']);
        $this->audit->log('document.archived', ['document_upload_id' => $doc->id]);
        return response()->json(['ok' => true, 'document' => $doc->fresh()]);
    }

    private function assertDocumentAccess(Request $request, DocumentUpload $doc): void
    {
        $user = $request->user();

        if (!$doc->branch_id) {
            return;
        }

        $this->branchScope->assertCanAccessBranch($user, (string) $doc->branch_id);
        $selectedBranchId = $this->branchScope->selectedBranchId($request, $user);

        abort_if(
            $selectedBranchId && (string) $selectedBranchId !== (string) $doc->branch_id,
            403,
            'This document belongs to another branch.'
        );
    }

    private function applyDocumentScope($query, Request $request): void
    {
        $user = $request->user();
        $selected = $this->branchScope->selectedBranchId($request, $user);

        if ($this->branchScope->canViewAllBranches($user) && !$selected) {
            return;
        }

        $branchIds = $selected
            ? [(string) $selected]
            : $this->branchScope->accessibleBranchIds($user);

        $query->where(function ($inner) use ($branchIds) {
            $inner->whereNull('branch_id');

            if ($branchIds) {
                $inner->orWhereIn('branch_id', $branchIds);
            }
        });
    }
}
