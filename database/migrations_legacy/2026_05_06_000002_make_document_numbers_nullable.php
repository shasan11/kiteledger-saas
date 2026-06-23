<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('invoice_no', 40)->nullable()->change();
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->string('sales_order_no', 40)->nullable()->change();
        });

        Schema::table('proforma_invoices', function (Blueprint $table) {
            $table->string('proforma_no', 40)->nullable()->change();
        });

        Schema::table('customer_payments', function (Blueprint $table) {
            $table->string('payment_no', 40)->nullable()->change();
        });

        Schema::table('purchase_bills', function (Blueprint $table) {
            $table->string('bill_no', 40)->nullable()->change();
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->string('payment_no', 40)->nullable()->change();
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->string('sales_return_no', 40)->nullable()->change();
        });

        Schema::table('debit_notes', function (Blueprint $table) {
            $table->string('debit_note_no', 40)->nullable()->change();
        });

        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->string('adjustment_no', 40)->nullable()->change();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // Reversing nullable to NOT NULL can fail if null values exist — intentionally left as no-op
    }
};
