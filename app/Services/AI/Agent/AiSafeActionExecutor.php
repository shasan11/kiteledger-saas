<?php

namespace App\Services\AI\Agent;

use App\Models\AiActionAuditLog;
use App\Models\AiPendingAction;
use App\Services\AI\AiPermissionService;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AiSafeActionExecutor
{
    public function __construct(
        protected AiPermissionService $permissions,
        protected BranchScopeService $branchScope,
        protected AppContextService $appContext,
    ) {
    }

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

    /**
     * @param  array{ip?:string|null, user_agent?:string|null}  $context
     */
    public function execute(AiPendingAction $action, int|string|null $approvedBy, array $context = []): array
    {
        if (!in_array($action->status, ['pending', 'approved'], true)) {
            throw ValidationException::withMessages(['action' => 'AI action is not pending.']);
        }

        if (!empty($action->metadata['missing_fields'])) {
            throw ValidationException::withMessages(['action' => 'AI action is incomplete and cannot be executed.']);
        }

        $user = $approvedBy ? \App\Models\User::query()->find($approvedBy) : null;
        if (!$this->permissions->hasAny($user, ['ai.actions.approve', 'ai.actions.execute', 'ai.manage'])) {
            throw ValidationException::withMessages(['permission' => 'You do not have permission to approve AI actions.']);
        }

        if ($action->branch_id) {
            $this->branchScope->assertCanAccessBranch($user, (string) $action->branch_id);
        }

        return DB::transaction(function () use ($action, $approvedBy, $context) {
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
                ? $this->executeUpdate($action, $config, $context)
                : $this->executeCreateDraft($action, $config, $context);

            $action->forceFill([
                'status' => 'executed',
                'executed_at' => now(),
                'metadata' => array_merge($action->metadata ?? [], ['result' => $result]),
            ])->save();

            return $result;
        });
    }

    public function reject(AiPendingAction $action, int|string|null $rejectedBy, array $context = []): AiPendingAction
    {
        if (!$action->isPending()) {
            throw ValidationException::withMessages(['action' => 'Only pending AI actions can be rejected.']);
        }

        $action->forceFill([
            'status' => 'rejected',
            'approved_by' => $rejectedBy,
            'approved_at' => now(),
        ])->save();

        $this->writeAudit($action, 'rejected', null, null, $context);

        return $action->fresh();
    }

    /**
     * Record a failed execution attempt (called from the controller after the
     * transaction has rolled back, so the audit row survives).
     *
     * @param  array{ip?:string|null, user_agent?:string|null}  $context
     */
    public function recordFailure(AiPendingAction $action, string $message, array $context = []): void
    {
        $this->writeAudit($action, 'failed', null, ['error' => Str::limit($message, 200)], $context);
    }

    private function executeCreateDraft(AiPendingAction $action, array $config, array $context = []): array
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
        if (Schema::hasColumn($table, 'fiscal_year_id')) {
            $data['fiscal_year_id'] = $this->safeFiscalYearId();
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
        if ($numberColumn = $this->numberColumn($table)) {
            $data[$numberColumn] = $this->draftNumber($table, $action);
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
            $data[$dateColumn] = $payload[$dateColumn] ?? now()->toDateString();
        }

        foreach ($payload as $key => $value) {
            if ($value !== null && is_scalar($value) && $this->isSafeCreateColumn($table, $key) && !array_key_exists($key, $data)) {
                $data[$key] = $value;
            }
        }

        foreach (($payload['context_payload'] ?? []) as $key => $value) {
            if ($value !== null && is_scalar($value) && $this->isSafeCreateColumn($table, $key) && !array_key_exists($key, $data)) {
                $data[$key] = $value;
            }
        }

        if (empty($data)) {
            throw ValidationException::withMessages(['payload' => 'AI could not build safe draft payload for this module.']);
        }

        DB::table($table)->insert($data);

        $this->writeAudit($action, 'executed', null, $this->publicSnapshot($data), $context);

        return [
            'id' => $data['id'] ?? $id,
            'status' => 'draft',
            'open_url' => $config['url'] . '/' . ($data['id'] ?? $id),
            'message' => 'Draft record created. Please review and complete required fields.',
        ];
    }

    private function executeUpdate(AiPendingAction $action, array $config, array $context = []): array
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
        if (Schema::hasColumn($table, 'fiscal_year_id') && !empty($record->fiscal_year_id)) {
            $fiscalYear = \App\Models\FiscalYear::query()->whereKey($record->fiscal_year_id)->first();
            if ($fiscalYear && $this->appContext->isFiscalYearLocked($fiscalYear)) {
                throw ValidationException::withMessages(['record' => 'AI cannot update records in a closed or locked fiscal year.']);
            }
        }

        $changes = $action->payload['context_payload']['changes'] ?? $action->payload['requested_changes'] ?? [];
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

        $before = [];
        foreach (array_keys($safe) as $column) {
            if ($column === 'updated_at') {
                continue;
            }
            $before[$column] = $record->{$column} ?? null;
        }

        DB::table($table)->where('id', $targetId)->update($safe);

        $after = $safe;
        unset($after['updated_at']);

        $this->writeAudit($action, 'executed', $this->publicSnapshot($before), $this->publicSnapshot($after), $context);

        return [
            'id' => $targetId,
            'status' => 'updated',
            'open_url' => $config['url'] . '/' . $targetId,
            'message' => 'Draft record updated.',
        ];
    }

    /**
     * Persist an immutable audit row for an AI action. Never throws — auditing
     * must not break the action itself.
     *
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @param  array{ip?:string|null, user_agent?:string|null}  $context
     */
    private function writeAudit(AiPendingAction $action, string $status, ?array $before, ?array $after, array $context = []): void
    {
        try {
            AiActionAuditLog::create([
                'ai_pending_action_id' => $action->id,
                'user_id' => $action->approved_by ?? $action->user_id,
                'action_type' => $action->action_type,
                'module' => $action->module,
                'target_type' => $action->target_type,
                'target_id' => $action->target_id,
                'before_values' => $before,
                'after_values' => $after,
                'status' => $status,
                'ip_address' => $context['ip'] ?? null,
                'user_agent' => isset($context['user_agent']) ? Str::limit((string) $context['user_agent'], 480, '') : null,
            ]);
        } catch (\Throwable) {
            // Auditing is best-effort; never block the underlying action.
        }
    }

    /**
     * Strip internal/scope columns from an audit snapshot so the audit trail
     * carries business fields, not tenant internals.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function publicSnapshot(array $data): array
    {
        $hidden = ['id', 'branch_id', 'fiscal_year_id', 'user_add_id', 'user_edit_id', 'created_at', 'updated_at'];

        return collect($data)
            ->reject(fn ($value, $key) => in_array($key, $hidden, true))
            ->all();
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
        $blocked = ['id', 'approved', 'approved_at', 'approved_by', 'approved_by_id', 'void', 'voided_at', 'voided_by', 'voided_by_id', 'journal_voucher_id', 'created_at', 'updated_at'];
        return !in_array($column, $blocked, true) && Schema::hasColumn($table, $column);
    }

    private function isSafeCreateColumn(string $table, string $column): bool
    {
        $blocked = ['id', 'approved', 'approved_at', 'approved_by', 'approved_by_id', 'void', 'voided_at', 'voided_by', 'voided_by_id', 'journal_voucher_id', 'created_at', 'updated_at', 'status'];
        return !in_array($column, $blocked, true) && Schema::hasColumn($table, $column);
    }

    private function numberColumn(string $table): ?string
    {
        foreach (['invoice_no', 'quotation_no', 'sales_order_no', 'purchase_order_no', 'bill_no', 'payment_no', 'expense_no', 'voucher_no', 'transfer_no'] as $column) {
            if (Schema::hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }

    private function draftNumber(string $table, AiPendingAction $action): string
    {
        $prefix = match ($table) {
            'invoices' => 'AI-INV',
            'quotations' => 'AI-QTN',
            'sales_orders' => 'AI-SO',
            'purchase_orders' => 'AI-PO',
            'purchase_bills' => 'AI-PB',
            'customer_payments', 'supplier_payments' => 'AI-PAY',
            'expenses' => 'AI-EXP',
            'journal_vouchers' => 'AI-JV',
            'cash_transfers' => 'AI-CT',
            default => 'AI',
        };

        return $prefix . '-' . now()->format('ymdHis') . '-' . substr((string) $action->id, 0, 6);
    }

    private function safeFiscalYearId(): ?string
    {
        try {
            $fiscalYear = $this->appContext->resolveFiscalYearForRequest(request());
            if (!$fiscalYear) {
                return null;
            }

            if ($this->appContext->isFiscalYearLocked($fiscalYear) && !$this->appContext->canOverrideFiscalYearLock(request()->user())) {
                throw ValidationException::withMessages(['fiscal_year_id' => 'AI cannot create records in a closed or locked fiscal year.']);
            }

            return (string) $fiscalYear->id;
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable) {
            return null;
        }
    }
}
