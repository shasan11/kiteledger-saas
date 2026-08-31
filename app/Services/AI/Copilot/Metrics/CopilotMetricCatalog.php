<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot\Metrics;

use App\Services\AI\Copilot\CopilotException;
use App\Services\AI\Tools\Queries\InventoryQueryTool;
use App\Services\AI\Tools\Queries\JournalVoucherQueryTool;
use App\Services\AI\Tools\Queries\PayableQueryTool;
use App\Services\AI\Tools\Queries\PurchaseQueryTool;
use App\Services\AI\Tools\Queries\ReceivableQueryTool;
use App\Services\AI\Tools\Queries\SalesQueryTool;

/**
 * Canonical financial metrics.
 *
 * This is the seam that removes the double interpretation: a caller supplies a
 * metric key and an operation, and the catalog resolves straight to the
 * deterministic PHP handler. Nothing here re-parses natural language, and no
 * arithmetic happens in this layer — the existing query services remain the
 * only place accounting values are computed.
 *
 * Adding a metric means adding a row here, not adding phrase patterns.
 */
final class CopilotMetricCatalog
{
    /**
     * metric key => [
     *   label, definition, permissions,
     *   operations => [operation => [handlerClass, method]],
     *   dimensions, currency (bool)
     * ]
     *
     * `permissions` lists **domain** permissions only — never the ai.* capability
     * permission. The two gates are checked separately: the registry decides
     * whether the user may use the financial tool at all, and this list decides
     * whether they may see this particular figure. Folding ai.financial_queries
     * in here would make the any-of check pass for every metric as soon as a
     * user held the generic AI permission.
     */
    private const METRICS = [
        'accounts_receivable' => [
            'label' => 'Accounts receivable',
            'definition' => 'Total outstanding amount owed to the company by customers.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [ReceivableQueryTool::class, 'totalReceivable'],
                'rank' => [ReceivableQueryTool::class, 'highestCustomerBalance'],
                'list' => [ReceivableQueryTool::class, 'unpaidInvoices'],
                'ageing' => [ReceivableQueryTool::class, 'customerAgeing'],
            ],
            'dimensions' => ['customer'],
            'currency' => true,
        ],
        'overdue_receivable' => [
            'label' => 'Overdue receivable',
            'definition' => 'Receivable balance past its due date.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [ReceivableQueryTool::class, 'overdueReceivable'],
                'rank' => [ReceivableQueryTool::class, 'topOverdueCustomers'],
                'ageing' => [ReceivableQueryTool::class, 'customerAgeing'],
            ],
            'dimensions' => ['customer'],
            'currency' => true,
        ],
        'accounts_payable' => [
            'label' => 'Accounts payable',
            'definition' => 'Total outstanding amount the company owes suppliers.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [PayableQueryTool::class, 'totalPayable'],
                'rank' => [PayableQueryTool::class, 'highestSupplierBalance'],
                'list' => [PayableQueryTool::class, 'unpaidBills'],
                'ageing' => [PayableQueryTool::class, 'supplierAgeing'],
            ],
            'dimensions' => ['supplier'],
            'currency' => true,
        ],
        'overdue_payable' => [
            'label' => 'Overdue payable',
            'definition' => 'Payable balance past its due date.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [PayableQueryTool::class, 'overduePayable'],
                'rank' => [PayableQueryTool::class, 'topOverdueSuppliers'],
                'ageing' => [PayableQueryTool::class, 'supplierAgeing'],
            ],
            'dimensions' => ['supplier'],
            'currency' => true,
        ],
        'net_sales' => [
            'label' => 'Net sales',
            'definition' => 'Sales invoiced in the period, net of returns.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [SalesQueryTool::class, 'salesThisMonth'],
                'rank' => [SalesQueryTool::class, 'topCustomerBySales'],
                'list' => [SalesQueryTool::class, 'approvedInvoices'],
                'by_branch' => [SalesQueryTool::class, 'salesByBranch'],
                'by_product' => [SalesQueryTool::class, 'salesByProduct'],
            ],
            'dimensions' => ['customer', 'branch', 'product', 'status'],
            'currency' => true,
        ],
        'gross_purchases' => [
            'label' => 'Gross purchases',
            'definition' => 'Purchases billed in the period.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [PurchaseQueryTool::class, 'purchasesThisMonth'],
                'rank' => [PurchaseQueryTool::class, 'topSupplierByPurchase'],
                'list' => [PurchaseQueryTool::class, 'approvedPurchaseBills'],
                'by_branch' => [PurchaseQueryTool::class, 'purchaseByBranch'],
                'by_product' => [PurchaseQueryTool::class, 'purchaseByProduct'],
            ],
            'dimensions' => ['supplier', 'branch', 'product', 'status'],
            'currency' => true,
        ],
        'cash_balance' => [
            'label' => 'Cash balance',
            'definition' => 'Current cash account balance from posted journal entries.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [JournalVoucherQueryTool::class, 'cashBalance'],
            ],
            'dimensions' => [],
            'currency' => true,
        ],
        'bank_balance' => [
            'label' => 'Bank balance',
            'definition' => 'Current bank account balance from posted journal entries.',
            'permissions' => ['reports.financial.view'],
            'operations' => [
                'summary' => [JournalVoucherQueryTool::class, 'bankBalance'],
            ],
            'dimensions' => [],
            'currency' => true,
        ],
        'inventory_value' => [
            'label' => 'Inventory value',
            'definition' => 'Valuation of stock currently on hand.',
            'permissions' => ['inventory.report.view'],
            'operations' => [
                'summary' => [InventoryQueryTool::class, 'inventoryValue'],
                'by_warehouse' => [InventoryQueryTool::class, 'warehouseWiseStock'],
            ],
            'dimensions' => ['warehouse'],
            'currency' => true,
        ],
        'stock_on_hand' => [
            'label' => 'Stock on hand',
            'definition' => 'Quantities currently held, by product and warehouse.',
            'permissions' => ['inventory.report.view'],
            'operations' => [
                'summary' => [InventoryQueryTool::class, 'warehouseWiseStock'],
                'low_stock' => [InventoryQueryTool::class, 'lowStock'],
                'dead_stock' => [InventoryQueryTool::class, 'deadStock'],
                'fast_moving' => [InventoryQueryTool::class, 'fastMovingProducts'],
            ],
            'dimensions' => ['product', 'warehouse'],
            'currency' => false,
        ],
    ];

    /** @return string[] */
    public function metricKeys(): array
    {
        return array_keys(self::METRICS);
    }

    public function has(string $metric): bool
    {
        return isset(self::METRICS[$metric]);
    }

    /** @return string[] */
    public function operationsFor(string $metric): array
    {
        return array_keys(self::METRICS[$metric]['operations'] ?? []);
    }

    /**
     * Resolves a metric+operation to its deterministic handler.
     *
     * Unknown metrics and operations fail closed rather than degrading to a
     * "closest match" — a silently substituted metric is a wrong number.
     */
    public function resolve(string $metric, string $operation): CopilotMetricDefinition
    {
        $metric = strtolower(trim($metric));
        $operation = strtolower(trim($operation)) ?: 'summary';

        if (! isset(self::METRICS[$metric])) {
            throw new CopilotException(
                'I do not have a verified calculation for that figure.',
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }

        $config = self::METRICS[$metric];

        if (! isset($config['operations'][$operation])) {
            $supported = implode(', ', array_keys($config['operations']));

            throw new CopilotException(
                "I cannot compute that variation of {$config['label']}. Supported: {$supported}.",
                CopilotException::AI_TOOL_VALIDATION_FAILED,
            );
        }

        [$handlerClass, $method] = $config['operations'][$operation];

        return new CopilotMetricDefinition(
            key: $metric,
            label: $config['label'],
            definition: $config['definition'],
            operation: $operation,
            handlerClass: $handlerClass,
            handlerMethod: $method,
            requiredPermissions: $config['permissions'],
            supportedDimensions: $config['dimensions'],
            hasCurrency: $config['currency'],
        );
    }

    /**
     * Catalog description injected into the tool schema so the model chooses
     * from real metric keys instead of inventing them.
     */
    public function schemaHint(): string
    {
        $lines = [];

        foreach (self::METRICS as $key => $config) {
            $lines[] = $key.' ('.implode('|', array_keys($config['operations'])).'): '.$config['definition'];
        }

        return implode("\n", $lines);
    }
}
