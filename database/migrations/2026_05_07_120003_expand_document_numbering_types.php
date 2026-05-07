<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $types = [
        'cash_transfer', 'credit_note', 'debit_note', 'expense', 'inventory_adjustment',
        'invoice', 'journal_voucher', 'payment', 'production_journal', 'production_order',
        'purchase_bill', 'purchase_order', 'quotation', 'receipt', 'sales_order',
        'sales_return', 'warehouse_transfer', 'payroll', 'deduction', 'increment',
        'contact', 'lead', 'deal', 'product', 'bank_account', 'capital', 'cash',
        'current_asset', 'current_liability', 'direct_expense', 'direct_income',
        'indirect_expense', 'indirect_income', 'non_current_asset',
        'non_current_liability', 'reserve_surplus', 'loan_account', 'loan_topup',
        'loan_charge', 'proforma_invoice', 'payslip', 'leave_application',
    ];

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildSqlite();
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            $quoted = collect($this->types)->map(fn ($type) => "'{$type}'")->implode(',');
            DB::statement("ALTER TABLE document_numberings MODIFY document_type ENUM({$quoted}) NOT NULL");
        }
    }

    public function down(): void
    {
        // Keep expanded values to avoid invalidating existing document numbering rows.
    }

    private function rebuildSqlite(): void
    {
        $quoted = collect($this->types)->map(fn ($type) => "'{$type}'")->implode(',');

        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement('CREATE TABLE IF NOT EXISTS document_numberings_new (
            id varchar not null primary key,
            document_type varchar not null check ("document_type" in (' . $quoted . ')),
            prefix varchar,
            next_number integer not null default 1,
            type_of_account varchar not null default "auto_numbering" check ("type_of_account" in ("auto_numbering", "manual_numbering")),
            reset_every_fiscal_year tinyint(1) not null default 0,
            add_fiscal_year_in_code tinyint(1) not null default 0,
            enable_fiscal_year_next_number tinyint(1) not null default 0,
            active tinyint(1) not null default 1,
            is_system_generated tinyint(1) not null default 0,
            user_add_id integer,
            created_at datetime,
            updated_at datetime,
            foreign key(user_add_id) references users(id)
        )');

        DB::statement('INSERT INTO document_numberings_new
            (id, document_type, prefix, next_number, type_of_account, reset_every_fiscal_year,
             add_fiscal_year_in_code, enable_fiscal_year_next_number, active, is_system_generated,
             user_add_id, created_at, updated_at)
            SELECT id, document_type, prefix, next_number, type_of_account, reset_every_fiscal_year,
                   add_fiscal_year_in_code, enable_fiscal_year_next_number, active, is_system_generated,
                   user_add_id, created_at, updated_at
            FROM document_numberings');

        DB::statement('DROP TABLE document_numberings');
        DB::statement('ALTER TABLE document_numberings_new RENAME TO document_numberings');
        DB::statement('PRAGMA foreign_keys = ON');
    }
};
