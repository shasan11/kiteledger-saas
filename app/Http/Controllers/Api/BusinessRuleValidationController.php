<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BusinessRules\TransactionRuleValidator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BusinessRuleValidationController extends Controller
{
    public function __invoke(Request $request, TransactionRuleValidator $validator)
    {
        $data = $request->validate([
            'module' => ['required', 'string', 'max:80'],
            'action' => ['nullable', Rule::in(['save', 'edit', 'approval'])],
            'transaction_id' => ['nullable'],
            'transaction' => ['nullable', 'array'],
        ]);

        $module = $validator->normalizeModule($data['module']);
        $transaction = $data['transaction'] ?? null;

        if (!$transaction && !empty($data['transaction_id'])) {
            $transaction = $this->findTransaction($module, $data['transaction_id']);
        }

        abort_unless($transaction, 422, 'Provide transaction_id or transaction payload for business rule validation.');

        $result = match ($data['action'] ?? 'approval') {
            'save' => $validator->validateForSave($module, $transaction),
            'edit' => $validator->validateForEdit($module, $transaction),
            default => $validator->validateForApproval($module, $transaction),
        };

        return response()->json($result);
    }

    private function findTransaction(string $module, mixed $id): Model
    {
        $class = $this->modelForModule($module);
        abort_unless($class && class_exists($class), 422, "No model mapping exists for module {$module}.");

        /** @var Model $model */
        $model = new $class();
        $relations = $this->relationsFor($module);

        return $class::query()
            ->with(array_filter($relations, fn ($relation) => method_exists($model, explode('.', $relation)[0])))
            ->findOrFail($id);
    }

    private function modelForModule(string $module): ?string
    {
        $map = [
            'quotation' => \App\Models\Quotation::class,
            'sales_order' => \App\Models\SalesOrder::class,
            'invoice' => \App\Models\Invoice::class,
            'credit_note' => \App\Models\SalesReturn::class,
            'customer_payment' => \App\Models\CustomerPayment::class,
            'purchase_order' => \App\Models\PurchaseOrder::class,
            'purchase_bill' => \App\Models\PurchaseBill::class,
            'debit_note' => \App\Models\DebitNote::class,
            'supplier_payment' => \App\Models\SupplierPayment::class,
            'inventory_adjustment' => \App\Models\InventoryAdjustment::class,
            'warehouse_transfer' => \App\Models\WarehouseTransfer::class,
            'bill_of_material' => \App\Models\BillOfMaterial::class,
            'production_order' => \App\Models\ProductionOrder::class,
            'production_journal' => \App\Models\ProductionJournal::class,
            'cash_transfer' => \App\Models\CashTransfer::class,
            'cheque_register' => \App\Models\ChequeRegister::class,
            'journal_voucher' => \App\Models\JournalVoucher::class,
            'payroll' => \App\Models\Payroll::class,
            'payroll_payment' => \App\Models\PayrollPayment::class,
        ];

        return $map[Str::snake($module)] ?? null;
    }

    private function relationsFor(string $module): array
    {
        return [
            'quotation' => ['quotationLines.product', 'contact'],
            'sales_order' => ['salesOrderLines.product', 'contact', 'warehouse'],
            'invoice' => ['invoiceLines.product', 'contact', 'warehouse'],
            'credit_note' => ['salesReturnLines.product', 'contact', 'warehouse'],
            'customer_payment' => ['account', 'contact'],
            'purchase_order' => ['purchaseOrderLines.product', 'contact', 'warehouse'],
            'purchase_bill' => ['purchaseBillLines.product', 'contact', 'warehouse', 'account'],
            'debit_note' => ['debitNoteLines.product', 'contact', 'warehouse'],
            'supplier_payment' => ['account', 'contact'],
            'inventory_adjustment' => ['inventoryAdjustmentLines.product', 'warehouse'],
            'warehouse_transfer' => ['warehouseTransferLines.product', 'fromWarehouse'],
            'bill_of_material' => ['rawMaterials.product'],
            'production_order' => ['rawMaterials.product'],
            'production_journal' => ['rawMaterials.product'],
            'cash_transfer' => ['fromAccount', 'cashTransferLines'],
            'cheque_register' => ['account'],
            'journal_voucher' => ['journalVoucherLines.account'],
            'payroll' => ['sourceAccount', 'payslips'],
            'payroll_payment' => ['payroll', 'payslip'],
        ][$module] ?? [];
    }
}
