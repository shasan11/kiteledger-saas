<?php

namespace App\Services\BusinessRules;

use App\Models\Account;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TransactionRuleValidator
{
    public function __construct(
        private readonly BusinessRuleSettingResolver $settings,
        private readonly AccountBalanceResolver $accounts,
        private readonly InventoryBalanceResolver $inventory,
        private readonly CreditLimitResolver $credit,
        private readonly SuggestedSellingPriceResolver $sellingPrice,
    ) {
    }

    public function validateForSave(string $module, Model|array $transaction): array
    {
        return $this->validate($module, $transaction, 'save');
    }

    public function validateForEdit(string $module, Model|array $transaction): array
    {
        return $this->validate($module, $transaction, 'edit');
    }

    public function validateForApproval(string $module, Model|array $transaction): array
    {
        return $this->validate($module, $transaction, 'approval');
    }

    public function validateNegativeCashBalance(string $module, Model|array $transaction): array
    {
        $setting = $this->getRuleSetting($module, 'negative_cash_balance');
        $impacts = $this->cashImpacts($module, $transaction);

        if ($impacts->isEmpty()) {
            return [$this->notApplicable('negative_cash_balance', 'Negative Cash Balance', $setting, 'No cash or bank outflow was detected for this transaction.')];
        }

        return $impacts->map(function (array $impact) use ($setting) {
            $account = $this->accounts->account($impact['account_id'] ?? null);

            if (!$this->accounts->isCashOrBank($account)) {
                return $this->notApplicable('negative_cash_balance', 'Negative Cash Balance', $setting, 'Selected account is not a cash or bank account.');
            }

            $current = $this->accounts->balance($account);
            $amount = (float) ($impact['amount'] ?? 0);
            $projected = $current - $amount;

            if ($amount <= 0 || $projected >= 0) {
                return $this->passed('negative_cash_balance', 'Negative Cash Balance', $setting, 'Cash or bank balance is sufficient.', [
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'current_balance' => $current,
                    'transaction_amount' => $amount,
                    'projected_balance' => $projected,
                ]);
            }

            return $this->ruleResult(
                'negative_cash_balance',
                'Negative Cash Balance',
                $setting,
                sprintf('%s will become negative by Rs. %s.', $account->name, number_format(abs($projected), 2)),
                [
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'current_balance' => $current,
                    'transaction_amount' => $amount,
                    'projected_balance' => $projected,
                    'negative_amount' => abs($projected),
                    'direction' => $impact['direction'] ?? 'out',
                ]
            );
        })->values()->all();
    }

    public function validateNegativeItemBalance(string $module, Model|array $transaction): array
    {
        $setting = $this->getRuleSetting($module, 'negative_item_balance');
        $outgoing = $this->stockOutflows($module, $transaction);

        if ($outgoing->isEmpty()) {
            return [$this->notApplicable('negative_item_balance', 'Negative Item Balance', $setting, 'No inventory decrease was detected for this transaction.')];
        }

        return $outgoing->map(function (array $line) use ($setting) {
            $product = $this->inventory->product($line['product_id'] ?? null);
            if (!$this->inventory->tracksInventory($product)) {
                return $this->notApplicable('negative_item_balance', 'Negative Item Balance', $setting, 'This line is a service or non-stock item.');
            }

            $warehouseId = $line['warehouse_id'] ?? null;
            if (!$warehouseId) {
                return $this->notApplicable('negative_item_balance', 'Negative Item Balance', $setting, 'No source warehouse was selected for this stock line.');
            }

            $current = $this->inventory->currentStock($product?->id, $warehouseId);
            $required = (float) ($line['qty'] ?? 0);
            $projected = $current - $required;

            if ($required <= 0 || $projected >= 0) {
                return $this->passed('negative_item_balance', 'Negative Item Balance', $setting, 'Stock balance is sufficient.', [
                    'product_id' => $product?->id,
                    'product_name' => $product?->name,
                    'warehouse_id' => $warehouseId,
                    'warehouse_name' => $line['warehouse_name'] ?? null,
                    'current_stock' => $current,
                    'required_qty' => $required,
                    'projected_stock' => $projected,
                ]);
            }

            return $this->ruleResult(
                'negative_item_balance',
                'Negative Item Balance',
                $setting,
                sprintf('%s stock will become negative by %s.', $product?->name ?: 'Item', number_format(abs($projected), 4)),
                [
                    'product_id' => $product?->id,
                    'product_name' => $product?->name,
                    'warehouse_id' => $warehouseId,
                    'warehouse_name' => $line['warehouse_name'] ?? null,
                    'current_stock' => $current,
                    'required_qty' => $required,
                    'projected_stock' => $projected,
                    'shortage_qty' => abs($projected),
                ]
            );
        })->values()->all();
    }

    public function validateCreditLimit(string $module, Model|array $transaction): array
    {
        $setting = $this->getRuleSetting($module, 'credit_limit_exceed');

        if (!$this->isCustomerExposureModule($module)) {
            return [$this->notApplicable('credit_limit_exceed', 'Credit Limit Exceed', $setting, 'This transaction does not increase customer credit exposure.')];
        }

        $contact = $this->credit->contact($this->value($transaction, 'contact_id'));
        if (!$contact) {
            return [$this->notApplicable('credit_limit_exceed', 'Credit Limit Exceed', $setting, 'No customer was selected.')];
        }

        $limit = $this->credit->creditLimit($contact);
        if ($limit === null || $limit <= 0) {
            return [$this->passed('credit_limit_exceed', 'Credit Limit Exceed', $setting, 'Customer has no credit limit configured, so exposure is treated as unlimited.', [
                'customer_id' => $contact->id,
                'customer_name' => $contact->name,
                'credit_limit' => null,
            ])];
        }

        $outstanding = $this->credit->outstanding($contact);
        $impact = $this->receivableImpact($module, $transaction);
        $projected = $outstanding + $impact;
        $exceeded = max(0, $projected - $limit);

        $details = [
            'customer_id' => $contact->id,
            'customer_name' => $contact->name,
            'credit_limit' => $limit,
            'current_outstanding' => $outstanding,
            'transaction_amount' => $impact,
            'projected_outstanding' => $projected,
            'exceeded_amount' => $exceeded,
        ];

        if ($projected <= $limit) {
            return [$this->passed('credit_limit_exceed', 'Credit Limit Exceed', $setting, 'Customer credit limit is sufficient.', $details)];
        }

        return [$this->ruleResult(
            'credit_limit_exceed',
            'Credit Limit Exceed',
            $setting,
            sprintf('%s will exceed the credit limit by Rs. %s.', $contact->name, number_format($exceeded, 2)),
            $details
        )];
    }

    public function validateSuggestedSellingPrice(string $module, Model|array $transaction): array
    {
        $setting = $this->getRuleSetting($module, 'suggest_selling');

        if (!$this->isSalesPricingModule($module)) {
            return [$this->notApplicable('suggest_selling', 'Suggested Selling Price', $setting, 'Suggested selling price applies only to editable sales item prices.')];
        }

        $lines = $this->salesLines($module, $transaction);
        if ($lines->isEmpty()) {
            return [$this->notApplicable('suggest_selling', 'Suggested Selling Price', $setting, 'No sales item lines were found.')];
        }

        return $lines->map(function (array $line) use ($setting, $transaction) {
            $product = $this->inventory->product($line['product_id'] ?? null);
            if (!$product) {
                return $this->notApplicable('suggest_selling', 'Suggested Selling Price', $setting, 'Line has no stock product selected.');
            }

            $suggestion = $this->sellingPrice->suggest($product, $this->value($transaction, 'contact_id'), $setting);
            $entered = (float) ($line['unit_price'] ?? 0);
            $suggested = $suggestion['suggested_price'];
            $averageCost = (float) ($suggestion['average_cost'] ?? 0);
            $belowSuggested = $suggested !== null && $entered > 0 && $entered < (float) $suggested;
            $belowCost = $averageCost > 0 && $entered > 0 && $entered < $averageCost;

            $details = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'entered_price' => $entered,
                'suggested_price' => $suggested,
                'last_sale_price' => $suggestion['last_sale_price'],
                'standard_price' => $suggestion['standard_price'],
                'average_cost' => $averageCost,
                'markup_price' => $suggestion['markup_price'],
                'difference' => $suggested !== null ? round($entered - (float) $suggested, 2) : null,
            ];

            if ($belowCost || $belowSuggested) {
                return [
                    'key' => 'suggest_selling',
                    'label' => 'Suggested Selling Price',
                    'setting' => $setting,
                    'severity' => 'warning',
                    'status' => 'warning',
                    'can_continue' => true,
                    'message' => $belowCost
                        ? sprintf('%s is priced below average cost.', $product->name)
                        : sprintf('%s is priced below the suggested selling price.', $product->name),
                    'details' => $details,
                ];
            }

            return [
                'key' => 'suggest_selling',
                'label' => 'Suggested Selling Price',
                'setting' => $setting,
                'severity' => 'info',
                'status' => 'passed',
                'can_continue' => true,
                'message' => 'Entered price is aligned with the configured pricing suggestion.',
                'details' => $details,
            ];
        })->values()->all();
    }

    public function getRuleSetting(string $module, string $settingKey): string
    {
        return $this->settings->get($module, $settingKey);
    }

    public function normalizeResult(array $checks): array
    {
        $checks = collect($checks)->flatten(1)->values()->all();
        $hasErrors = collect($checks)->contains(fn ($check) => ($check['status'] ?? null) === 'error');
        $hasWarnings = collect($checks)->contains(fn ($check) => ($check['status'] ?? null) === 'warning');

        return [
            'can_proceed' => !$hasErrors,
            'has_warnings' => $hasWarnings,
            'has_errors' => $hasErrors,
            'checks' => $checks,
        ];
    }

    public function throwIfBlocked(array $result): void
    {
        if (!($result['has_errors'] ?? false)) {
            return;
        }

        throw new HttpResponseException(response()->json($this->blockedResponse($result), 422));
    }

    public function blockedResponse(array $result): array
    {
        return [
            'message' => 'Transaction blocked by business rules.',
            'business_rules' => $result,
        ];
    }

    private function validate(string $module, Model|array $transaction, string $action): array
    {
        $module = $this->normalizeModule($module, $transaction);

        return $this->normalizeResult([
            $this->validateNegativeCashBalance($module, $transaction),
            $this->validateNegativeItemBalance($module, $transaction),
            $this->validateCreditLimit($module, $transaction),
            $this->validateSuggestedSellingPrice($module, $transaction),
        ]);
    }

    private function ruleResult(string $key, string $label, string $setting, string $message, array $details): array
    {
        $isBlocked = $setting === 'block';

        return [
            'key' => $key,
            'label' => $label,
            'setting' => $setting,
            'severity' => $isBlocked ? 'error' : ($setting === 'warn' ? 'warning' : 'info'),
            'status' => $isBlocked ? 'error' : ($setting === 'warn' ? 'warning' : 'passed'),
            'can_continue' => !$isBlocked,
            'message' => $setting === 'allow' ? "{$label} check passed under allow setting." : $message,
            'details' => $details,
        ];
    }

    private function passed(string $key, string $label, string $setting, string $message, array $details = []): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'setting' => $setting,
            'severity' => 'success',
            'status' => 'passed',
            'can_continue' => true,
            'message' => $message,
            'details' => $details,
        ];
    }

    private function notApplicable(string $key, string $label, string $setting, string $message): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'setting' => $setting,
            'severity' => 'default',
            'status' => 'not_applicable',
            'can_continue' => true,
            'message' => $message,
            'details' => [],
        ];
    }

    private function cashImpacts(string $module, Model|array $transaction): Collection
    {
        $amount = $this->amount($transaction);

        return (match ($module) {
            'supplier_payment' => collect([['account_id' => $this->value($transaction, 'account_id'), 'amount' => $amount + (float) $this->value($transaction, 'bank_charges', 0)]]),
            'cash_transfer' => collect([['account_id' => $this->value($transaction, 'from_account_id'), 'amount' => $this->value($transaction, 'total_amount', $amount)]]),
            'cheque_register' => $this->value($transaction, 'direction') === 'received'
                ? collect()
                : collect([['account_id' => $this->value($transaction, 'account_id'), 'amount' => $amount]]),
            'journal_voucher' => $this->journalCashImpacts($transaction),
            'payroll' => $this->value($transaction, 'source_account_id')
                ? collect([['account_id' => $this->value($transaction, 'source_account_id'), 'amount' => $this->value($transaction, 'total_net_payable', $amount)]])
                : collect(),
            'payroll_payment' => collect([['account_id' => $this->value($transaction, 'source_account_id') ?: $this->value($transaction, 'account_id'), 'amount' => $amount]]),
            'purchase_bill' => $this->value($transaction, 'account_id') ? collect([['account_id' => $this->value($transaction, 'account_id'), 'amount' => $amount]]) : collect(),
            default => collect(),
        })->filter(fn ($impact) => !empty($impact['account_id']) && (float) ($impact['amount'] ?? 0) > 0)->values();
    }

    private function journalCashImpacts(Model|array $transaction): Collection
    {
        return $this->lines($transaction, ['journalVoucherLines', 'journal_voucher_lines', 'items'])
            ->map(function ($line) {
                $line = $this->lineArray($line);
                $account = $this->accounts->account($line['account_id'] ?? null);
                if (!$this->accounts->isCashOrBank($account)) {
                    return null;
                }

                return [
                    'account_id' => $account->id,
                    'amount' => (float) ($line['credit'] ?? 0),
                    'direction' => 'credit',
                ];
            })
            ->filter(fn ($impact) => $impact && (float) $impact['amount'] > 0)
            ->groupBy('account_id')
            ->map(fn ($rows, $accountId) => ['account_id' => $accountId, 'amount' => $rows->sum('amount'), 'direction' => 'credit'])
            ->values();
    }

    private function stockOutflows(string $module, Model|array $transaction): Collection
    {
        $warehouseId = $this->value($transaction, 'warehouse_id') ?: $this->value($transaction, 'from_warehouse_id');

        $keys = match ($module) {
            'invoice', 'sales_invoice' => ['invoiceLines', 'invoice_lines', 'items'],
            'sales_order' => ['salesOrderLines', 'sales_order_lines', 'items'],
            'credit_note', 'sales_return' => [],
            'debit_note' => ['debitNoteLines', 'debit_note_lines', 'items'],
            'inventory_adjustment' => ['inventoryAdjustmentLines', 'inventory_adjustment_lines', 'items'],
            'warehouse_transfer' => ['warehouseTransferLines', 'warehouse_transfer_lines', 'items'],
            'production_order' => ['rawMaterials', 'raw_materials', 'productionOrderRawMaterials', 'production_order_raw_materials', 'items'],
            'production_journal' => ['rawMaterials', 'raw_materials', 'productionJournalRawMaterials', 'production_journal_raw_materials', 'items'],
            'bill_of_material' => ['rawMaterials', 'raw_materials', 'billOfMaterialRawMaterials', 'bill_of_material_raw_materials', 'items'],
            default => [],
        };

        if (!$keys) {
            return collect();
        }

        return $this->lines($transaction, $keys)
            ->map(function ($line) use ($module, $warehouseId) {
                $line = $this->lineArray($line);
                if ($module === 'inventory_adjustment' && ($line['adjustment_type'] ?? null) !== 'decrease') {
                    return null;
                }

                $lineWarehouseId = $line['warehouse_id'] ?? $warehouseId;

                return [
                    'product_id' => $line['product_id'] ?? null,
                    'warehouse_id' => $lineWarehouseId,
                    'warehouse_name' => data_get($line, 'warehouse.name'),
                    'qty' => (float) ($line['qty'] ?? $line['quantity'] ?? 0),
                ];
            })
            ->filter(fn ($line) => $line && !empty($line['product_id']) && (float) ($line['qty'] ?? 0) > 0)
            ->groupBy(fn ($line) => ($line['product_id'] ?? '') . '|' . ($line['warehouse_id'] ?? ''))
            ->map(function ($rows) {
                $first = $rows->first();
                $first['qty'] = $rows->sum('qty');
                return $first;
            })
            ->values();
    }

    private function salesLines(string $module, Model|array $transaction): Collection
    {
        $keys = match ($module) {
            'quotation' => ['quotationLines', 'quotation_lines', 'items'],
            'sales_order' => ['salesOrderLines', 'sales_order_lines', 'items'],
            'invoice', 'sales_invoice' => ['invoiceLines', 'invoice_lines', 'items'],
            'credit_note', 'sales_return' => ['salesReturnLines', 'sales_return_lines', 'items'],
            default => [],
        };

        return $this->lines($transaction, $keys)->map(fn ($line) => $this->lineArray($line));
    }

    private function lines(Model|array $transaction, array $keys): Collection
    {
        foreach ($keys as $key) {
            $value = $this->value($transaction, $key);
            if ($value instanceof Collection) {
                return $value;
            }
            if (is_iterable($value)) {
                return collect($value);
            }
        }

        return collect();
    }

    private function lineArray(mixed $line): array
    {
        if ($line instanceof Model) {
            return $line->toArray();
        }

        return is_array($line) ? $line : [];
    }

    private function isCustomerExposureModule(string $module): bool
    {
        return in_array($module, ['quotation', 'sales_order', 'invoice', 'sales_invoice'], true);
    }

    private function isSalesPricingModule(string $module): bool
    {
        return in_array($module, ['quotation', 'sales_order', 'invoice', 'sales_invoice', 'credit_note', 'sales_return'], true);
    }

    private function receivableImpact(string $module, Model|array $transaction): float
    {
        if (in_array($module, ['customer_payment', 'credit_note', 'sales_return'], true)) {
            return 0.0;
        }

        return $this->amount($transaction);
    }

    private function amount(Model|array $transaction): float
    {
        foreach (['grand_total', 'total_amount', 'total_net_payable', 'total', 'amount', 'paid_amount'] as $key) {
            $value = $this->value($transaction, $key);
            if ($value !== null && $value !== '') {
                return (float) $value;
            }
        }

        return 0.0;
    }

    private function value(Model|array $transaction, string $key, mixed $default = null): mixed
    {
        if ($transaction instanceof Model) {
            return data_get($transaction, $key, $default);
        }

        return data_get($transaction, $key, $default);
    }

    public function normalizeModule(string $module, Model|array|null $transaction = null): string
    {
        if ($module !== '') {
            $module = Str::snake(class_basename($module));
        } elseif ($transaction instanceof Model) {
            $module = Str::snake(class_basename($transaction));
        }

        return match ($module) {
            'sales_invoice' => 'invoice',
            'sales_return' => 'credit_note',
            'bill_of_materials' => 'bill_of_material',
            default => $module,
        };
    }
}
