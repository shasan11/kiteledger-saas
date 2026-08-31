<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\User;
use Illuminate\Http\Request;

final readonly class CopilotContext
{
    private const SAFE_INPUTS = [
        'message', 'query', 'customer_reference', 'supplier_reference',
        'record_reference', 'date_from', 'date_to', 'from_date', 'to_date',
        'status', 'limit', 'module', 'context_type', 'context_payload',
    ];

    public function __construct(
        public User $user,
        public ?string $tenantId,
        public string $tenantConnection,
        public ?string $branchId,
        public array $allowedBranchIds,
        public ?string $fiscalYearId,
        public array $allowedFiscalYearIds,
        public array $permissions,
        public string $applicationUrl,
        public string $module,
        public ?string $conversationId,
        public string $locale,
        public string $baseCurrency,
        public string $timezone,
        private Request $request,
    ) {}

    public function request(array $inputs = []): Request
    {
        $request = clone $this->request;
        $request->replace(array_intersect_key($inputs, array_flip(self::SAFE_INPUTS)));
        $request->setUserResolver(fn (): User => $this->user);

        if ($this->branchId) {
            $request->headers->set('X-Branch-ID', $this->branchId);
        }
        if ($this->fiscalYearId) {
            $request->headers->set('X-Fiscal-Year-ID', $this->fiscalYearId);
        }

        return $request;
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions, true);
    }

    public function safePromptContext(): array
    {
        return [
            'module' => $this->module,
            'locale' => $this->locale,
            'currency' => $this->baseCurrency,
            'timezone' => $this->timezone,
            'branch_scope' => $this->branchId ? 'selected branch' : 'all authorized branches',
            'fiscal_year_scope' => $this->fiscalYearId ? 'selected fiscal year' : 'authorized fiscal years',
        ];
    }
}
