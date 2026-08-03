<?php

namespace App\Services\AI;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class AiDomainAuthorizationService
{
    public function __construct(private readonly AiPermissionService $permissions) {}

    public function assertCanReadQuery(?User $user, string $queryToolClass): void
    {
        $allowed = match (class_basename($queryToolClass)) {
            'ProductQueryTool' => ['master.product.view', 'reports.inventory.view'],
            'InventoryQueryTool' => ['reports.inventory.view', 'master.product.view'],
            'ContactQueryTool' => ['master.contact.view'],
            'BankAccountQueryTool' => ['accounting.bank_account.view', 'reports.financial.view'],
            'JournalVoucherQueryTool' => ['accounting.journal_voucher.view', 'reports.financial.view'],
            'ReceivableQueryTool' => ['sales.invoice.view', 'reports.sales.view', 'reports.financial.view'],
            'PayableQueryTool' => ['purchase.purchase_bill.view', 'reports.purchase.view', 'reports.financial.view'],
            'SalesQueryTool' => ['sales.invoice.view', 'reports.sales.view'],
            'PurchaseQueryTool' => ['purchase.purchase_bill.view', 'reports.purchase.view'],
            'ReportQueryTool' => ['reports.view', 'reports.financial.view', 'reports.sales.view', 'reports.purchase.view', 'reports.inventory.view', 'reports.tax.view'],
            default => [],
        };

        $this->assertAny($user, $allowed, 'You do not have permission to read the requested business module.');
    }

    public function assertCanReadFinancialIntent(?User $user, string $intent): void
    {
        $allowed = match ($intent) {
            'sales_summary', 'receivable_summary' => ['reports.sales.view', 'sales.invoice.view', 'reports.financial.view'],
            'purchase_summary', 'payable_summary' => ['reports.purchase.view', 'purchase.purchase_bill.view', 'reports.financial.view'],
            'tax_summary' => ['reports.tax.view', 'reports.financial.view'],
            default => ['reports.financial.view'],
        };

        $this->assertAny($user, $allowed, 'You do not have permission to read this financial information.');
    }

    public function assertCanProposeAction(?User $user, string $module, string $actionType): void
    {
        if (! $this->permissions->hasAny($user, ['ai.action.propose', 'ai.actions.manage', 'ai.manage'])) {
            throw ValidationException::withMessages([
                'permission' => 'You do not have permission to propose AI actions.',
            ]);
        }

        $this->assertCanMutateModule($user, $module, $actionType);
    }

    public function assertCanExecuteAction(?User $user, string $module, string $actionType): void
    {
        $this->assertCanMutateModule($user, $module, $actionType);
    }

    private function assertCanMutateModule(?User $user, string $module, string $actionType): void
    {
        $operation = str_contains($actionType, 'update_') ? 'update' : 'create';
        $prefix = match ($module) {
            'quotations' => 'sales.quotation',
            'sales_orders' => 'sales.sales_order',
            'invoices' => 'sales.invoice',
            'customer_payments' => 'receivable.customer_payment',
            'credit_notes' => 'sales.credit_note',
            'purchase_orders' => 'purchase.purchase_order',
            'purchase_bills' => 'purchase.purchase_bill',
            'supplier_payments' => 'payable.supplier_payment',
            'debit_notes' => 'purchase.debit_note',
            'expenses' => 'accounting.expense',
            'journal_vouchers' => 'accounting.journal_voucher',
            'cash_transfers' => 'accounting.cash_transfer',
            'products' => 'master.product',
            'contacts' => 'master.contact',
            default => null,
        };

        if (! $prefix) {
            throw ValidationException::withMessages(['module' => 'Unsupported AI action module.']);
        }

        $this->assertAny($user, ["{$prefix}.{$operation}"], 'You do not have permission to change the requested business module.');
    }

    /**
     * Domain permissions are deliberately independent from AI permissions.
     * ai.chat and ai.manage never grant access to an accounting module.
     */
    private function assertAny(?User $user, array $permissions, string $message): void
    {
        if ($permissions === [] || ! $this->permissions->hasAny($user, $permissions)) {
            throw ValidationException::withMessages(['permission' => $message]);
        }
    }
}
