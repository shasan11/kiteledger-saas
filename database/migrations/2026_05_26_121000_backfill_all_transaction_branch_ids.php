<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'quotations',
        'sales_orders',
        'proforma_invoices',
        'invoices',
        'customer_payments',
        'sales_returns',
        'purchase_orders',
        'purchase_bills',
        'expenses',
        'debit_notes',
        'supplier_payments',
        'journal_vouchers',
        'cash_transfers',
        'cheque_registers',
        'inventory_adjustments',
        'warehouse_transfers',
        'production_orders',
        'production_journals',
        'pos_sales',
        'pos_returns',
        'pos_shifts',
        'payrolls',
        'payroll_runs',
        'payroll_payments',
        'payslips',
    ];

    public function up(): void
    {
        $branchId = DB::table('branches')
            ->where('active', true)
            ->where('is_head_office', true)
            ->value('id')
            ?: DB::table('branches')
                ->where('active', true)
                ->orderBy('created_at')
                ->value('id');

        if (!$branchId) {
            return;
        }

        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'branch_id')) {
                continue;
            }

            DB::table($table)
                ->whereNull('branch_id')
                ->update([
                    'branch_id' => $branchId,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        //
    }
};
