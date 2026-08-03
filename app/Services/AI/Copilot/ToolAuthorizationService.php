<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Services\AI\AiPermissionService;

final class ToolAuthorizationService
{
    private const REQUIREMENTS = [
        'search_knowledge' => ['ai.search', 'ai.records.search', 'ai.use', 'ai.chat'],
        'search_business_records' => ['ai.search', 'ai.records.search'],
        'find_report' => ['ai.report_queries', 'ai.report_summary', 'reports.financial.view'],
        'run_financial_query' => ['ai.financial_queries', 'reports.financial.view'],
        'get_customer_balance' => ['ai.financial_queries', 'reports.financial.view'],
        'get_supplier_balance' => ['ai.financial_queries', 'reports.financial.view'],
        'get_inventory_summary' => ['ai.financial_queries', 'inventory.report.view'],
        'propose_business_action' => ['ai.action.propose', 'ai.actions.execute'],
    ];

    public function __construct(private AiPermissionService $permissions) {}

    public function allows(CopilotContext $context, string $tool): bool
    {
        if ($this->permissions->has($context->user, 'ai.manage')) {
            return true;
        }

        return $this->permissions->hasAny($context->user, self::REQUIREMENTS[$tool] ?? []);
    }
}
