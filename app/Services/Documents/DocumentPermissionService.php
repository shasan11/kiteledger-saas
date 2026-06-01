<?php

namespace App\Services\Documents;

use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DocumentPermissionService
{
    public const ALL = [
        'document_upload.view',
        'document_upload.create',
        'document_upload.update',
        'document_upload.delete',
        'document_upload.archive',
        'document_upload.scan_ai',
        'document_upload.extract.view',
        'document_upload.entity_match',
        'document_upload.create_fk',
        'document_upload.proposal.create',
        'document_upload.proposal.update',
        'document_upload.convert',
        'document_upload.duplicate_override',
    ];

    public function canBypass(?User $user): bool
    {
        if (!$user) return false;
        if (!empty($user->is_super_admin)) return true;
        try {
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole([
                'Super Admin', 'Admin', 'Company Owner', 'Company Admin',
                'Full Access User', 'Full Access Admin', 'super-admin', 'admin',
            ])) {
                return true;
            }
        } catch (\Throwable) {}
        return $this->hasDirect($user, 'document_upload.manage');
    }

    public function has(?User $user, string $permission): bool
    {
        if (!$user) return false;
        if ($this->canBypass($user)) return true;
        return $this->hasDirect($user, $permission);
    }

    public function authorize(?User $user, string $permission): void
    {
        if (!$this->has($user, $permission)) {
            throw new HttpException(403, json_encode([
                'ok' => false,
                'message' => 'You do not have permission for this document action.',
                'code' => 'DOCUMENT_PERMISSION_DENIED',
                'required_permission' => $permission,
            ]));
        }
    }

    public function summary(?User $user): array
    {
        $out = [];
        foreach (self::ALL as $p) $out[$p] = $this->has($user, $p);
        return $out;
    }

    private function hasDirect(User $user, string $permission): bool
    {
        try {
            if (method_exists($user, 'hasPermissionTo')) {
                return $user->hasPermissionTo($permission);
            }
        } catch (\Throwable) {}
        return false;
    }
}
