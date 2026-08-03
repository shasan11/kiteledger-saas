<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Throwable;

final class CopilotContextFactory
{
    public function __construct(
        private BranchScopeService $branches,
        private AppContextService $appContext,
    ) {}

    public function make(Request $request, ?AiConversation $conversation = null, ?string $module = null): CopilotContext
    {
        $user = $request->user();
        abort_unless($user, 401);

        try {
            $application = $this->appContext->context($request);
        } catch (Throwable) {
            $application = [];
        }

        $permissions = [];
        try {
            $permissions = $user->getAllPermissions()->pluck('name')->map(fn ($value) => (string) $value)->values()->all();
        } catch (Throwable) {
            // A newly provisioned tenant may not have permission tables yet.
        }

        $settings = $application['app_settings'] ?? null;
        $currency = $settings?->defaultCurrency?->code
            ?? $settings?->defaultCurrency?->symbol
            ?? (tenant()?->currency ?? 'NPR');

        return new CopilotContext(
            user: $user,
            tenantId: tenancy()->initialized && tenant() ? (string) tenant()->getTenantKey() : null,
            tenantConnection: (string) ($user->getConnectionName() ?: config('database.default')),
            branchId: $this->branches->selectedBranchId($request, $user),
            allowedBranchIds: $this->branches->accessibleBranchIds($user),
            fiscalYearId: isset($application['current_fiscal_year_id']) ? (string) $application['current_fiscal_year_id'] : null,
            allowedFiscalYearIds: collect($application['available_fiscal_years'] ?? [])->pluck('id')->filter()->map(fn ($id) => (string) $id)->values()->all(),
            permissions: $permissions,
            applicationUrl: rtrim((string) config('app.url'), '/'),
            module: $module ?: ($conversation?->module ?: 'general'),
            conversationId: $conversation?->id,
            locale: (string) ($user->locale ?: app()->getLocale()),
            baseCurrency: (string) $currency,
            timezone: (string) (tenant()?->timezone ?: config('app.timezone', 'UTC')),
            request: $request,
        );
    }
}
