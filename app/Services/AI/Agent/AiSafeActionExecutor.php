<?php

namespace App\Services\AI\Agent;

use App\Models\AiPendingAction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AiSafeActionExecutor
{
    protected array $moduleTables = [
        'quotations' => ['table' => 'quotations', 'url' => '/payment-in/quotations'],
        'sales_orders' => ['table' => 'sales_orders', 'url' => '/payment-in/sales-orders'],
        'invoices' => ['table' => 'invoices', 'url' => '/payment-in/invoices'],
        'customer_payments' => ['table' => 'customer_payments', 'url' => '/payment-in/customer-payments'],
        'credit_notes' => ['table' => 'credit_notes', 'url' => '/payment-in/credit-notes'],
        'purchase_orders' => ['table' => 'purchase_orders', 'url' => '/payment-out/purchase-orders'],
        'purchase_bills' => ['table' => 'purchase_bills', 'url' => '/payment-out/purchase-bills'],
        'supplier_payments' => ['table' => 'supplier_payments', 'url' => '/payment-out/supplier-payments'],
        'debit_notes' => ['table' => 'debit_notes', 'url' => '/payment-out/debit-notes'],
        'expenses' => ['table' => 'expenses', 'url' => '/payment-out/expenses'],
        'journal_vouchers' => ['table' => 'journal_vouchers', 'url' => '/accounting/journal-vouchers'],
        'cash_transfers' => ['table' => 'cash_transfers', 'url' => '/accounting/cash-transfers'],
        'products' => ['table' => 'products', 'url' => '/inventory/products'],
        'contacts' => ['table' => 'contacts', 'url' => '/actors/contacts'],
    ];

    public function execute(AiPendingAction $action, int|string|null $approvedBy): array
    {
        if (!$action->isPending()) {
            throw ValidationException::withMessages(['action' => 'AI action is not pending.']);
        }

        return DB::transaction(function () use ($action, $approvedBy) {
            $action->forceFill([
                'status' => 'approved',
                'approved_by' => $approvedBy,
                'approved_at' => now(),
            ])->save();

            $module = $action->module;
            $config = $this->moduleTables[$module] ?? null;
            if (!$config || !Schema::hasTable($config['table'])) {
                throw ValidationException::withMessages(['module' => 'Unsupported AI module/action: ' . $module]);
            }

            $result = str_starts_with($action->action_type, 'update_')
                ? $this->executeUpdate($action, $config)
                : $this->executeCreateDraft($action, $config);

            $action->forceFill([
                'status' => 'executed',
                'executed_at' => now(),
                'metadata' => array_merge($action->metadata ?? [], ['result' => $result]),
            ])->save();

            return $result;
        });
    }

    public function reject(AiPendingAction $action, int|string|null $rejectedBy): AiPendingAction
    {
        if (!$action->isPending()) {
            throw ValidationException::withMessages(['action' => 'Only pending AI actions can be rejected.']);
        }

        $action->forceFill([
            'status' => 'rejected',
            'approved_by' => $rejectedBy,
            'approved_at' => now(),
        ])->save();

        return $action->fresh();
    }

    private function executeCreateDraft(AiPendingAction $action, array $config): array
    {
        $table = $config['table'];
        $payload = $action->payload ?? [];
        $id = (string) Str::uuid();
        $data = [];

        if (Schema::hasColumn($table, 'id')) {
            $data['id'] = $id;
        }
        if (Schema::hasColumn($table, 'branch_id') && $action->branch_id) {
            $data['branch_id'] = $action->branch_id;
        }
        if (Schema::hasColumn($table, 'active')) {
            $data['active'] = true;
        }
        if (Schema::hasColumn($table, 'approved')) {
            $data['approved'] = false;
        }
        if (Schema::hasColumn($table, 'status')) {
            $data['status'] = 'draft';
        }
        if (Schema::hasColumn($table, 'notes')) {
            $data['notes'] = 'Draft created by Kite AI. Review before approval.';
        }
        if (Schema::hasColumn($table, 'remarks')) {
            $data['remarks'] = 'Draft created by Kite AI. Review before approval.';
        }
        if (Schema::hasColumn($table, 'reference')) {
            $data['reference'] = 'AI-' . substr((string) $action->id, 0, 8);
        }
        if (Schema::hasColumn($table, 'user_add_id') && $action->user_id) {
            $data['user_add_id'] = $action->user_id;
        }
        if (Schema::hasColumn($table, 'created_at')) {
            $data['created_at'] = now();
        }
        if (Schema::hasColumn($table, 'updated_at')) {
            $data['updated_at'] = now();
        }

        $dateColumn = $this->dateColumn($table);
        if ($dateColumn) {
            $data[$dateColumn] = now()->toDateString();
        }

        foreach (($payload['context_payload'] ?? []) as $key => $value) {
            if ($value !== null && is_scalar($value) && Schema::hasColumn($table, $key) && !array_key_exists($key, $data)) {
                $data[$key] = $value;
            }
        }

        if (empty($data)) {
            throw ValidationException::withMessages(['payload' => 'AI could not build safe draft payload for this module.']);
        }

        DB::table($table)->insert($data);

        return [
            'id' => $data['id'] ?? $id,
            'status' => 'draft',
            'open_url' => $config['url'] . '/' . ($data['id'] ?? $id),
            'message' => 'Draft record created. Please review and complete required fields.',
        ];
    }

    private function executeUpdate(AiPendingAction $action, array $config): array
    {
        $table = $config['table'];
        $targetId = $action->target_id ?: ($action->payload['target_id'] ?? null);
        if (!$targetId) {
            throw ValidationException::withMessages(['target_id' => 'Missing target record for AI update.']);
        }

        $record = DB::table($table)->where('id', $targetId)->first();
        if (!$record) {
            throw ValidationException::withMessages(['target_id' => 'Target record not found.']);
        }

        if (Schema::hasColumn($table, 'void') && (bool) ($record->void ?? false)) {
            throw ValidationException::withMessages(['record' => 'AI cannot update voided records.']);
        }
        if (Schema::hasColumn($table, 'approved') && (bool) ($record->approved ?? false)) {
            throw ValidationException::withMessages(['record' => 'AI cannot update approved records directly. Edit through normal workflow.']);
        }

        $changes = $action->payload['context_payload']['changes'] ?? [];
        $safe = [];
        foreach ($changes as $key => $value) {
            if ($this->isSafeUpdateColumn($table, $key) && is_scalar($value)) {
                $safe[$key] = $value;
            }
        }
        if (Schema::hasColumn($table, 'updated_at')) {
            $safe['updated_at'] = now();
        }

        if (empty($safe)) {
            throw ValidationException::withMessages(['changes' => 'No safe update fields were provided.']);
        }

        DB::table($table)->where('id', $targetId)->update($safe);

        return [
            'id' => $targetId,
            'status' => 'updated',
            'open_url' => $config['url'] . '/' . $targetId,
            'message' => 'Draft record updated.',
        ];
    }

    private function dateColumn(string $table): ?string
    {
        foreach (['invoice_date', 'quotation_date', 'order_date', 'bill_date', 'payment_date', 'expense_date', 'voucher_date', 'transfer_date', 'date'] as $column) {
            if (Schema::hasColumn($table, $column)) return $column;
        }
        return null;
    }

    private function isSafeUpdateColumn(string $table, string $column): bool
    {
        $blocked = ['id', 'approved', 'approved_at', 'approved_by_id', 'void', 'voided_at', 'voided_by_id', 'journal_voucher_id', 'created_at', 'updated_at'];
        return !in_array($column, $blocked, true) && Schema::hasColumn($table, $column);
    }
}
