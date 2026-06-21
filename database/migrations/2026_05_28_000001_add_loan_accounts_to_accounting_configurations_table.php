<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounting_configurations', function (Blueprint $table) {
            // Explicit, short FK names: the conventional
            // "{table}_{column}_foreign" name for these columns is 71 chars,
            // over MySQL's 64-char identifier limit (error 1059).
            if (! Schema::hasColumn('accounting_configurations', 'loan_processing_fee_expense_account_id')) {
                $table->foreignUuid('loan_processing_fee_expense_account_id')
                    ->nullable()
                    ->after('inventory_account_id')
                    ->constrained(table: 'chart_of_accounts', indexName: 'acc_cfg_loan_proc_fee_exp_acc_fk')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('accounting_configurations', 'loan_charge_expense_account_id')) {
                $table->foreignUuid('loan_charge_expense_account_id')
                    ->nullable()
                    ->after('loan_processing_fee_expense_account_id')
                    ->constrained(table: 'chart_of_accounts', indexName: 'acc_cfg_loan_charge_exp_acc_fk')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('accounting_configurations', function (Blueprint $table) {
            // Drop by the explicit FK names set in up(); dropConstrainedForeignId
            // would look for the conventional name and fail to find these.
            if (Schema::hasColumn('accounting_configurations', 'loan_charge_expense_account_id')) {
                $table->dropForeign('acc_cfg_loan_charge_exp_acc_fk');
                $table->dropColumn('loan_charge_expense_account_id');
            }

            if (Schema::hasColumn('accounting_configurations', 'loan_processing_fee_expense_account_id')) {
                $table->dropForeign('acc_cfg_loan_proc_fee_exp_acc_fk');
                $table->dropColumn('loan_processing_fee_expense_account_id');
            }
        });
    }
};
