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
        'ai.report_summary',
        'ai.business_insight',
        'ai.conversations.view',
        'ai.conversations.delete',
        'ai.settings.view',
        'ai.settings.update',
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
        return $this->hasAny($user, ['ai.report_summary', 'ai.use', 'ai.manage']);
    }

    public function canBusinessInsight(?User $user): bool
    {
        return $this->hasAny($user, ['ai.business_insight', 'ai.use', 'ai.manage']);
    }

    public function authorize(?User $user, string $permission): void
    {
        if (!$this->has($user, $permission)) {
            throw new HttpException(403, json_encode([
                'message' => 'You do not have permission to use AI Assistant.',
                'code' => 'AI_PERMISSION_DENIED',
                'required_permission' => $permission,
            ]));
        }
    }

    public function authorizeAny(?User $user, array $permissions, string $required = 'ai.use'): void
    {
        if (!$this->hasAny($user, $permissions)) {
            throw new HttpException(403, json_encode([
                'message' => 'You do not have permission to use AI Assistant.',
                'code' => 'AI_PERMISSION_DENIED',
                'required_permission' => $required,
            ]));
        }
    }

    public function summary(?User $user): array
    {
        return [
            'ai.view' => $this->has($user, 'ai.view'),
            'ai.use' => $this->has($user, 'ai.use'),
            'ai.chat' => $this->has($user, 'ai.chat'),
            'ai.report_summary' => $this->has($user, 'ai.report_summary'),
            'ai.business_insight' => $this->has($user, 'ai.business_insight'),
            'ai.conversations.view' => $this->has($user, 'ai.conversations.view'),
            'ai.conversations.delete' => $this->has($user, 'ai.conversations.delete'),
            'ai.settings.view' => $this->has($user, 'ai.settings.view'),
            'ai.settings.update' => $this->has($user, 'ai.settings.update'),
            'ai.manage' => $this->has($user, 'ai.manage'),
        ];
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
