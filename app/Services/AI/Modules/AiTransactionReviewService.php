<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

class AiTransactionReviewService
{
    protected const MODULE = 'transaction_review';
    protected const PERMISSION = 'ai.transaction_review.use';

    // Supported module → model class map
    protected array $moduleMap = [
        'invoices'               => \App\Models\Invoice::class,
        'purchase-bills'         => \App\Models\PurchaseBill::class,
        'expenses'               => \App\Models\Expense::class,
        'customer-payments'      => \App\Models\CustomerPayment::class,
        'supplier-payments'      => \App\Models\SupplierPayment::class,
        'journal-vouchers'       => \App\Models\JournalVoucher::class,
        'cash-transfers'         => \App\Models\CashTransfer::class,
        'debit-notes'            => \App\Models\DebitNote::class,
        'credit-notes'           => \App\Models\SalesReturn::class,
        'inventory-adjustments'  => \App\Models\InventoryAdjustment::class,
        'production-orders'      => \App\Models\ProductionOrder::class,
    ];

    public function __construct(
        protected AiActionGuard    $guard,
        protected AiProviderService $provider,
        protected AiContextBuilder $contextBuilder,
        protected AiPromptService  $prompts,
    ) {}

    public function review(string $module, string $id): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $modelClass = $this->moduleMap[$module] ?? null;

        if (!$modelClass || !class_exists($modelClass)) {
            abort(422, "Module '{$module}' is not supported for AI review.");
        }

        $record = $modelClass::findOrFail($id);

        $context    = $this->contextBuilder->transactionContext($module, $record);
        $systemPrompt = $this->prompts->transactionReviewPrompt();

        $userPrompt = "Review the following ERP transaction for risks and issues. Module: {$module}\n\nTransaction data:\n"
            . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $systemPrompt,
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        // Ensure required keys
        return array_merge([
            'summary'                  => '',
            'risk_level'               => 'low',
            'can_proceed'              => true,
            'issues'                   => [],
            'checks'                   => [],
            'recommended_next_action'  => '',
        ], $data);
    }
}
