<?php

namespace App\Http\Controllers\Api\Documents;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentUploadResource;
use App\Models\DocumentUpload;
use App\Services\Documents\DocumentAuditService;
use App\Services\Documents\DocumentPermissionService;
use App\Services\Documents\DocumentStorageService;
use App\Services\BranchScopeService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $this->authorize('viewAny', DocumentUpload::class);

        $q = DocumentUpload::query()
            ->with(['extraction', 'uploader:id,name'])
            ->withCount('proposals')
            ->latest();

        $this->applyDocumentScope($q, $request);
        $this->applyFilters($q, $request);

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);

        return DocumentUploadResource::collection($q->paginate($perPage))
            ->additional(['summary' => $this->summaryCounts($request)]);
    }

    /**
     * Status roll-up across the whole filtered dataset — never just the current
     * page. Computed with a grouped aggregate so it stays a single cheap query.
     */
    public function summary(Request $request)
    {
        $this->authorize('viewAny', DocumentUpload::class);

        return response()->json([
            'ok' => true,
            'summary' => $this->summaryCounts($request),
        ]);
    }

    private function summaryCounts(Request $request): array
    {
        $q = DocumentUpload::query();
        $this->applyDocumentScope($q, $request);
        $this->applyFilters($q, $request, ignoreStatus: true);

        $byStatus = $q->groupBy('status')
            ->selectRaw('status, COUNT(*) as aggregate')
            ->pluck('aggregate', 'status')
            ->all();

        $count = static fn (array $statuses) => array_sum(
            array_map(static fn ($s) => (int) ($byStatus[$s] ?? 0), $statuses)
        );

        return [
            'uploaded' => $count(['uploaded']),
            'processing' => $count(['queued', 'processing']),
            'needs_review' => $count(['extracted', 'needs_review']),
            'converted' => $count(['converted']),
            'failed' => $count(['failed']),
            'archived' => $count(['archived']),
            'total' => array_sum(array_map('intval', $byStatus)),
            'by_status' => array_map('intval', $byStatus),
        ];
    }

    /**
     * Server-side filters. The status filter is skipped for summary counts so
     * the cards keep showing the full breakdown while a status is selected.
     */
    private function applyFilters($query, Request $request, bool $ignoreStatus = false): void
    {
        if ($search = trim((string) $request->get('search'))) {
            $escaped = addcslashes($search, '%_\\');
            $query->where(function ($inner) use ($escaped) {
                $inner->where('label', 'like', "%{$escaped}%")
                    ->orWhere('original_file_name', 'like', "%{$escaped}%")
                    ->orWhere('notes', 'like', "%{$escaped}%");
            });
        }

        if (! $ignoreStatus && $status = $request->get('status')) {
            $statuses = array_filter(array_map('trim', (array) $status));
            if ($statuses) {
                $query->whereIn('status', $statuses);
            }
        }

        if ($type = $request->get('document_type')) {
            $types = array_filter(array_map('trim', (array) $type));
            if ($types) {
                $query->whereIn('document_type', $types);
            }
        }

        if ($from = $this->parseDate($request->get('date_from'))) {
            $query->where('created_at', '>=', $from->startOfDay());
        }

        if ($to = $this->parseDate($request->get('date_to'))) {
            $query->where('created_at', '<=', $to->endOfDay());
        }
    }

    private function parseDate($value): ?CarbonImmutable
    {
        if (blank($value)) {
            return null;
        }

        try {
            return CarbonImmutable::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }
    }

    public function store(Request $request)
    {
        $this->authorize('create', DocumentUpload::class);

        // documents.max_upload_mb is the single application-level authority.
        // Laravel's file `max` rule is expressed in kilobytes.
        $maxKilobytes = max(1, (int) config('documents.max_upload_mb', 10)) * 1024;

        $validator = Validator::make($request->all(), [
            'label' => ['required', 'string', 'max:255'],
            'file' => [
                'required',
                'file',
                'max:'.$maxKilobytes,
                'mimes:pdf,docx,jpg,jpeg,png,webp',
                'mimetypes:application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp',
            ],
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

        // Branch authorization must resolve before anything touches the disk,
        // otherwise a rejected upload leaves an orphaned file behind.
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

        try {
            $stored = $this->storage->store($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => 'DOCUMENT_UPLOAD_FAILED',
            ], 422);
        }

        try {
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
        } catch (\Throwable $e) {
            // Compensating delete: the row never landed, so the file must not
            // survive as an unreferenced blob on the disk.
            $this->storage->deletePath($stored['file_path'] ?? null);

            report($e);

            return response()->json([
                'ok' => false,
                'message' => 'The document could not be saved. Please try again.',
                'code' => 'DOCUMENT_UPLOAD_FAILED',
            ], 500);
        }

        $this->audit->log('document.uploaded', ['document_upload_id' => $doc->id, 'label' => $doc->label]);

        return response()->json([
            'ok' => true,
            'document' => new DocumentUploadResource($doc->fresh(['extraction'])),
        ]);
    }

    public function show(Request $request, string $publicId)
    {
        $doc = DocumentUpload::query()
            ->with(['extraction', 'entityMatches', 'proposals', 'uploader:id,name'])
            ->where('public_id', $publicId)
            ->firstOrFail();
        $this->authorize('view', $doc);
        $this->assertDocumentAccess($request, $doc);

        return response()->json([
            'ok' => true,
            'document' => new DocumentUploadResource($doc),
            'preview_url' => route('api.document-uploads.preview', ['publicId' => $doc->public_id]),
        ]);
    }

    public function update(Request $request, string $publicId)
    {
        $doc = $this->findByPublicId($publicId);
        $this->authorize('update', $doc);
        $this->assertDocumentAccess($request, $doc);
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'document_type' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string'],
        ]);
        $doc->update(array_filter($data, fn ($v) => $v !== null));

        return response()->json([
            'ok' => true,
            'document' => new DocumentUploadResource($doc->fresh(['extraction'])),
        ]);
    }

    public function destroy(Request $request, string $publicId)
    {
        $doc = $this->findByPublicId($publicId);
        $this->assertDocumentAccess($request, $doc);
        $hasConverted = $doc->proposals()->where('status', 'converted')->exists();

        if ($hasConverted) {
            $this->perms->authorize($request->user(), 'document_upload.archive');
            $this->authorize('update', $doc);
            $doc->update(['status' => 'archived']);
            $this->audit->log('document.archived', ['document_upload_id' => $doc->id]);
            return response()->json(['ok' => true, 'message' => 'Document archived (linked transactions exist).']);
        }

        $this->authorize('delete', $doc);

        // Drop the row first so a filesystem failure can never leave a
        // dangling record pointing at a file that is already gone.
        $path = $doc->file_path;
        DB::transaction(fn () => $doc->delete());
        $this->storage->deletePath($path);

        $this->audit->log('document.deleted', ['document_upload_id' => $doc->id]);
        return response()->json(['ok' => true]);
    }

    public function preview(Request $request, string $publicId)
    {
        $doc = $this->findByPublicId($publicId);
        $this->authorize('preview', $doc);
        $this->assertDocumentAccess($request, $doc);

        return $this->storage->streamResponse($doc);
    }

    public function archive(Request $request, string $publicId)
    {
        $this->perms->authorize($request->user(), 'document_upload.archive');
        $doc = $this->findByPublicId($publicId);
        $this->authorize('update', $doc);
        $this->assertDocumentAccess($request, $doc);
        $doc->update(['status' => 'archived']);
        $this->audit->log('document.archived', ['document_upload_id' => $doc->id]);

        return response()->json([
            'ok' => true,
            'document' => new DocumentUploadResource($doc->fresh(['extraction'])),
        ]);
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

    private function findByPublicId(string $publicId): DocumentUpload
    {
        return DocumentUpload::query()
            ->where('public_id', $publicId)
            ->firstOrFail();
    }
}
