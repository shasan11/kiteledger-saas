<?php

namespace App\Services\AI;

use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiPermissionService
{
    public const ALL = [
        'ai.view',
        'ai.use',
        'ai.chat',
        'ai.semantic_search',
        'reports.ai_summary',
        'ai.report_summary',
        'ai.business_insight',
        'ai.conversations.view',
        'ai.conversations.delete',
        'ai.settings.view',
        'ai.settings.update',
        'ai.admin_settings',
        'ai.actions.view',
        'ai.actions.propose',
        'ai.actions.approve',
        'ai.actions.execute',
        'ai.actions.reject',
        'ai.records.search',
        'ai.records.show',
        'ai.manage',
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

        return $this->hasDirect($user, 'ai.manage');
    }

    public function has(?User $user, string $permission): bool
    {
        if (!$user) return false;
        if ($this->canBypass($user)) return true;
        return $this->hasDirect($user, $permission);
    }

    public function hasAny(?User $user, array $permissions): bool
    {
        if (!$user) return false;
        if ($this->canBypass($user)) return true;
        foreach ($permissions as $p) {
            if ($this->hasDirect($user, $p)) return true;
        }
        return false;
    }

    public function canUseAi(?User $user): bool
    {
        return $this->hasAny($user, ['ai.use', 'ai.view', 'ai.chat', 'ai.manage']);
    }

    public function canChat(?User $user): bool
    {
        return $this->hasAny($user, ['ai.chat', 'ai.use', 'ai.manage']);
    }

    public function canSemanticSearch(?User $user): bool
    {
        return $this->hasAny($user, ['ai.semantic_search', 'ai.use', 'ai.chat', 'ai.manage']);
    }

    public function canManage(?User $user): bool
    {
        return $this->hasAny($user, ['ai.manage', 'ai.settings.update']);
    }

    public function canViewSettings(?User $user): bool
    {
        return $this->hasAny($user, ['ai.settings.view', 'ai.manage']);
    }

    public function canSummarizeReports(?User $user): bool
    {
        return $this->hasAny($user, ['reports.ai_summary', 'ai.report_summary', 'ai.manage']);
    }

    public function canBusinessInsight(?User $user): bool
    {
        return $this->hasAny($user, ['ai.business_insight', 'ai.use', 'ai.manage']);
    }

    public function authorize(?User $user, string $permission): void
    {
        if (!$this->has($user, $permission)) {
            throw new HttpException(403, json_encode([
                'message' => 'You do not have permission to use AI report summaries.',
                'code' => 'AI_PERMISSION_DENIED',
                'required_permission' => $permission,
            ]));
        }
    }

    public function authorizeAny(?User $user, array $permissions, string $required = 'ai.use'): void
    {
        if (!$this->hasAny($user, $permissions)) {
            throw new HttpException(403, json_encode([
                'message' => 'You do not have permission to use AI report summaries.',
                'code' => 'AI_PERMISSION_DENIED',
                'required_permission' => $required,
            ]));
        }
    }

    public function summary(?User $user): array
    {
        $out = [];
        foreach (self::ALL as $permission) {
            $out[$permission] = $this->has($user, $permission);
        }
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
