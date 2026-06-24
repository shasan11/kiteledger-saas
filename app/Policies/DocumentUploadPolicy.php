<?php

namespace App\Policies;

use App\Models\DocumentUpload;
use App\Models\User;
use App\Services\BranchScopeService;
use App\Services\Documents\DocumentPermissionService;

class DocumentUploadPolicy
{
    public function __construct(
        protected DocumentPermissionService $permissions,
        protected BranchScopeService $branchScope,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->has($user, 'document_upload.view');
    }

    public function view(User $user, DocumentUpload $document): bool
    {
        return $this->permissions->has($user, 'document_upload.view')
            && $this->canAccessDocumentScope($user, $document);
    }

    public function create(User $user): bool
    {
        return $this->permissions->has($user, 'document_upload.create');
    }

    public function update(User $user, DocumentUpload $document): bool
    {
        return $this->permissions->has($user, 'document_upload.update')
            && $this->canAccessDocumentScope($user, $document);
    }

    public function delete(User $user, DocumentUpload $document): bool
    {
        return $this->permissions->has($user, 'document_upload.delete')
            && $this->canAccessDocumentScope($user, $document);
    }

    public function preview(User $user, DocumentUpload $document): bool
    {
        return $this->permissions->has($user, 'document_upload.view')
            && $this->canAccessDocumentScope($user, $document);
    }

    public function scanAi(User $user, DocumentUpload $document): bool
    {
        return $this->permissions->has($user, 'document_upload.scan_ai')
            && $this->canAccessDocumentScope($user, $document);
    }

    private function canAccessDocumentScope(User $user, DocumentUpload $document): bool
    {
        if ($document->branch_id && ! $this->branchScope->canAccessBranch($user, (string) $document->branch_id)) {
            return false;
        }

        if (isset($document->company_id) && $document->company_id && isset($user->company_id)) {
            return (string) $document->company_id === (string) $user->company_id;
        }

        if (isset($document->tenant_id) && $document->tenant_id && isset($user->tenant_id)) {
            return (string) $document->tenant_id === (string) $user->tenant_id;
        }

        return true;
    }
}
