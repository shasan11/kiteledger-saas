<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('customer_payments', function (Blueprint $table) {
            $table->dropForeign(['bank_charges_account_id']);
            $table->dropForeign(['tds_charges_account_id']);

            $table->decimal('bank_charges', 16, 2)->nullable()->default(0)->change();
            $table->decimal('tds_charges', 16, 2)->nullable()->default(0)->change();

            $table->foreign('bank_charges_account_id')->references('id')->on('accounts')->nullOnDelete();
            $table->foreign('tds_charges_account_id')->references('id')->on('accounts')->nullOnDelete();
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['bank_charges_account_id']);
            $table->dropForeign(['tds_charges_account_id']);

            $table->decimal('bank_charges', 16, 2)->nullable()->default(0)->change();
            $table->decimal('tds_charges', 16, 2)->nullable()->default(0)->change();

            $table->foreign('bank_charges_account_id')->references('id')->on('accounts')->nullOnDelete();
            $table->foreign('tds_charges_account_id')->references('id')->on('accounts')->nullOnDelete();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('customer_payments', function (Blueprint $table) {
            $table->dropForeign(['bank_charges_account_id']);
            $table->dropForeign(['tds_charges_account_id']);

            $table->decimal('bank_charges', 16, 2)->default(0)->change();
            $table->decimal('tds_charges', 16, 2)->default(0)->change();

            $table->foreign('bank_charges_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('tds_charges_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['bank_charges_account_id']);
            $table->dropForeign(['tds_charges_account_id']);

            $table->decimal('bank_charges', 16, 2)->default(0)->change();
            $table->decimal('tds_charges', 16, 2)->default(0)->change();

            $table->foreign('bank_charges_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('tds_charges_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
        });

        Schema::enableForeignKeyConstraints();
    }
};
