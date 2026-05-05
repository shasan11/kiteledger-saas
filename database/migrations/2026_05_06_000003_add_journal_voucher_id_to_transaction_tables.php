<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'invoices',
        'customer_payments',
        'purchase_bills',
        'supplier_payments',
        'expenses',
        'cash_transfers',
        'sales_returns',
        'debit_notes',
        'inventory_adjustments',
    ];

    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->uuid('journal_voucher_id')->nullable()->after('user_add_id');
                $table->foreign('journal_voucher_id')->references('id')->on('journal_vouchers')->nullOnDelete();
            });
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropForeign(['journal_voucher_id']);
                $table->dropColumn('journal_voucher_id');
            });
        }

        Schema::enableForeignKeyConstraints();
    }
};
