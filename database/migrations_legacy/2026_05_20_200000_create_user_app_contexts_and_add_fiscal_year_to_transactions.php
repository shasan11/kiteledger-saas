<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $transactionTables = [
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
        Schema::create('user_app_contexts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignUuid('fiscal_year_id')->nullable()->constrained('fiscal_years')->nullOnDelete();
            $table->timestamps();

            $table->index('branch_id');
            $table->index('fiscal_year_id');
        });

        foreach ($this->transactionTables as $tableName) {
            if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'fiscal_year_id')) {
                continue;
            }

            $afterColumn = Schema::hasColumn($tableName, 'branch_id') ? 'branch_id' : 'id';

            Schema::table($tableName, function (Blueprint $table) use ($afterColumn) {
                $table->foreignUuid('fiscal_year_id')
                    ->nullable()
                    ->after($afterColumn)
                    ->constrained('fiscal_years')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (array_reverse($this->transactionTables) as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'fiscal_year_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('fiscal_year_id');
            });
        }

        Schema::dropIfExists('user_app_contexts');
    }
};
