<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected array $indexes = [
        'branches' => ['code', 'name', 'email', 'phone'],
        'contacts' => ['name', 'code', 'phone', 'email', 'pan', 'tax_registration_no'],
        'currencies' => ['code', 'name'],
        'document_numberings' => ['document_type', 'prefix'],
        'chart_of_accounts' => ['branch_id', 'code', 'name', 'account_type'],
        'bank_accounts' => ['branch_id', 'code', 'display_name', 'account_number'],
        'journal_vouchers' => ['branch_id', 'voucher_no', 'status'],
        'cash_transfers' => ['branch_id', 'transfer_no', 'status'],
        'cheque_registers' => ['branch_id', 'cheque_no', 'status'],
        'loan_accounts' => ['loan_number', 'name', 'status'],
        'quotations' => ['branch_id', 'quotation_no', 'contact_id', 'status'],
        'sales_orders' => ['branch_id', 'sales_order_no', 'contact_id', 'status'],
        'proforma_invoices' => ['branch_id', 'proforma_no', 'contact_id', 'status'],
        'invoices' => ['branch_id', 'invoice_no', 'contact_id', 'status'],
        'customer_payments' => ['branch_id', 'payment_no', 'contact_id', 'status'],
        'sales_returns' => ['branch_id', 'sales_return_no', 'contact_id', 'status'],
        'purchase_orders' => ['branch_id', 'purchase_order_no', 'contact_id', 'status'],
        'purchase_bills' => ['branch_id', 'bill_no', 'contact_id', 'status'],
        'expenses' => ['branch_id', 'expense_no', 'contact_id', 'status'],
        'debit_notes' => ['branch_id', 'debit_note_no', 'contact_id', 'status'],
        'supplier_payments' => ['branch_id', 'payment_no', 'contact_id', 'status'],
        'products' => ['branch_id', 'code', 'name', 'sku', 'barcode'],
        'product_categories' => ['name'],
        'warehouses' => ['branch_id', 'code', 'name'],
        'warehouse_transfers' => ['branch_id', 'transfer_no', 'status'],
        'inventory_adjustments' => ['branch_id', 'adjustment_no', 'status'],
        'users' => ['branch_id', 'name', 'email', 'username', 'employee_id'],
        'attendances' => ['branch_id', 'user_id', 'in_time_status', 'out_time_status'],
        'leave_applications' => ['branch_id', 'user_id', 'leave_type', 'status'],
        'payslips' => ['branch_id', 'user_id', 'salary_month', 'salary_year', 'payment_status'],
        'projects' => ['name', 'status'],
        'tasks' => ['project_id', 'name'],
        'milestones' => ['project_id', 'name', 'status'],
        'pos_sales' => ['branch_id', 'sale_no', 'customer_phone', 'status', 'payment_status'],
        'pos_shifts' => ['branch_id', 'shift_no', 'status'],
        'pos_returns' => ['branch_id', 'return_no', 'status'],
        'pos_terminals' => ['branch_id', 'code', 'name'],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $columns) {
                foreach ($columns as $column) {
                    if (!Schema::hasColumn($table, $column)) {
                        continue;
                    }

                    $indexName = $this->indexName($table, $column);

                    if ($this->indexExists($table, $indexName, $column)) {
                        continue;
                    }

                    $blueprint->index($column, $indexName);
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $columns) {
                foreach ($columns as $column) {
                    $indexName = $this->indexName($table, $column);

                    if ($this->indexExists($table, $indexName, $column)) {
                        $blueprint->dropIndex($indexName);
                    }
                }
            });
        }
    }

    protected function indexName(string $table, string $column): string
    {
        return substr($table . '_' . $column . '_global_search_idx', 0, 64);
    }

    protected function indexExists(string $table, string $indexName, ?string $column = null): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        return match ($driver) {
            'mysql', 'mariadb' => $this->mysqlIndexExists($table, $indexName, $column),
            'pgsql' => $this->pgsqlIndexExists($table, $indexName, $column),
            'sqlite' => $this->sqliteIndexExists($table, $indexName, $column),
            default => false,
        };
    }

    protected function mysqlIndexExists(string $table, string $indexName, ?string $column): bool
    {
        $database = DB::getDatabaseName();
        $rows = DB::select(
            'select index_name, column_name from information_schema.statistics where table_schema = ? and table_name = ?',
            [$database, $table]
        );

        foreach ($rows as $row) {
            if (($row->index_name ?? null) === $indexName) {
                return true;
            }

            if ($column && ($row->column_name ?? null) === $column) {
                return true;
            }
        }

        return false;
    }

    protected function pgsqlIndexExists(string $table, string $indexName, ?string $column): bool
    {
        $rows = DB::select(
            'select indexname, indexdef from pg_indexes where schemaname = current_schema() and tablename = ?',
            [$table]
        );

        foreach ($rows as $row) {
            if (($row->indexname ?? null) === $indexName) {
                return true;
            }

            if ($column && str_contains((string) ($row->indexdef ?? ''), '(' . $column . ')')) {
                return true;
            }
        }

        return false;
    }

    protected function sqliteIndexExists(string $table, string $indexName, ?string $column): bool
    {
        $indexes = DB::select('pragma index_list("' . $table . '")');

        foreach ($indexes as $index) {
            if (($index->name ?? null) === $indexName) {
                return true;
            }

            if (!$column || empty($index->name)) {
                continue;
            }

            $columns = DB::select('pragma index_info("' . $index->name . '")');

            foreach ($columns as $indexColumn) {
                if (($indexColumn->name ?? null) === $column) {
                    return true;
                }
            }
        }

        return false;
    }
};
