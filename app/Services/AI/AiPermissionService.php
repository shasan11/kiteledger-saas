<?php

namespace App\Services\AI;

use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiPermissionService
{
    public const ALL = [
        'reports.ai_summary',
        'ai.settings.view',
        'ai.settings.update',
    ];

    public function canBypass(?User $user): bool
    {
        if (! $user) {
            return false;
        }
        if (! empty($user->is_super_admin)) {
            return true;
        }

        try {
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole([
                'Super Admin', 'Admin', 'Company Owner', 'Company Admin',
                'Full Access User', 'Full Access Admin', 'super-admin', 'admin',
            ])) {
                return true;
            }
        } catch (\Throwable) {
        }

        return false;
    }

    public function has(?User $user, string $permission): bool
    {
        if (! $user) {
            return false;
        }
        if ($this->canBypass($user)) {
            return true;
        }

        return $this->hasDirect($user, $permission);
    }

    public function hasAny(?User $user, array $permissions): bool
    {
        if (! $user) {
            return false;
        }
        if ($this->canBypass($user)) {
            return true;
        }
        foreach ($permissions as $p) {
            if ($this->hasDirect($user, $p)) {
                return true;
            }
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

    /**
     * Settings/config management (view + edit provider, model, keys, modes).
     * Granted by ai.settings.update or full ai.manage. This is CONFIG access and
     * must NOT, by itself, expose other users' conversations or actions.
     */
    public function canManage(?User $user): bool
    {
        return $this->has($user, 'ai.settings.update');
    }

    /**
     * Org-wide visibility into OTHER users' conversations and pending actions.
     * Deliberately NOT granted by ai.settings.update — configuring the provider
     * is not the same as reading everyone's financial AI history. Requires the
     * full ai.manage capability (or an admin role), or the granular data-manage
     * permissions. Normal users only ever see their own records.
     */
    public function canManageData(?User $user): bool
    {
        if (! $user) {
            return false;
        }
        if ($this->canBypass($user)) {
            return true;
        }

        return $this->hasDirect($user, 'ai.conversations.manage')
            || $this->hasDirect($user, 'ai.actions.manage');
    }

    public function canViewSettings(?User $user): bool
    {
        return $this->hasAny($user, ['ai.settings.view', 'ai.settings.update']);
    }

    public function canViewDebug(?User $user): bool
    {
        return $this->hasAny($user, ['ai.debug.view', 'ai.manage']);
    }

    public function canSummarizeReports(?User $user): bool
    {
        return $this->has($user, 'reports.ai_summary');
    }

    public function canBusinessInsight(?User $user): bool
    {
        return $this->hasAny($user, ['ai.business_insight', 'ai.use', 'ai.manage']);
    }

    public function authorize(?User $user, string $permission): void
    {
        if (! $this->has($user, $permission)) {
            throw new HttpException(403, json_encode([
                'message' => 'You do not have permission to use AI report summaries.',
                'code' => 'AI_PERMISSION_DENIED',
                'required_permission' => $permission,
            ]));
        }
    }

    public function authorizeAny(?User $user, array $permissions, string $required = 'ai.use'): void
    {
        if (! $this->hasAny($user, $permissions)) {
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
        } catch (\Throwable) {
        }

        return false;
    }
}
