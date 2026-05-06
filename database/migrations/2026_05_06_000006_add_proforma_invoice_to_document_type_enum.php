<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE document_numberings MODIFY COLUMN document_type ENUM(
            'cash_transfer','credit_note','debit_note','expense','inventory_adjustment',
            'invoice','proforma_invoice','journal_voucher','payment','production_journal',
            'production_order','purchase_bill','purchase_order','quotation','receipt',
            'sales_order','sales_return','warehouse_transfer','payroll','deduction',
            'increment','contact','lead','deal','product','bank_account','capital',
            'cash','current_asset','current_liability','direct_expense','direct_income',
            'indirect_expense','indirect_income','non_current_asset','non_current_liability',
            'reserve_surplus','loan_account','loan_topup','loan_charge'
        ) NOT NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE document_numberings MODIFY COLUMN document_type ENUM(
            'cash_transfer','credit_note','debit_note','expense','inventory_adjustment',
            'invoice','journal_voucher','payment','production_journal',
            'production_order','purchase_bill','purchase_order','quotation','receipt',
            'sales_order','sales_return','warehouse_transfer','payroll','deduction',
            'increment','contact','lead','deal','product','bank_account','capital',
            'cash','current_asset','current_liability','direct_expense','direct_income',
            'indirect_expense','indirect_income','non_current_asset','non_current_liability',
            'reserve_surplus','loan_account','loan_topup','loan_charge'
        ) NOT NULL");
    }
};
