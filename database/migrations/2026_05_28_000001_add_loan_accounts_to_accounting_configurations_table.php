<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounting_configurations', function (Blueprint $table) {
            if (! Schema::hasColumn('accounting_configurations', 'loan_processing_fee_expense_account_id')) {
                $table->foreignUuid('loan_processing_fee_expense_account_id')
                    ->nullable()
                    ->after('inventory_account_id')
                    ->constrained('chart_of_accounts')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('accounting_configurations', 'loan_charge_expense_account_id')) {
                $table->foreignUuid('loan_charge_expense_account_id')
                    ->nullable()
                    ->after('loan_processing_fee_expense_account_id')
                    ->constrained('chart_of_accounts')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('accounting_configurations', function (Blueprint $table) {
            if (Schema::hasColumn('accounting_configurations', 'loan_charge_expense_account_id')) {
                $table->dropConstrainedForeignId('loan_charge_expense_account_id');
            }

            if (Schema::hasColumn('accounting_configurations', 'loan_processing_fee_expense_account_id')) {
                $table->dropConstrainedForeignId('loan_processing_fee_expense_account_id');
            }
        });
    }
};
