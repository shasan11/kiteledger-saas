<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('custom_field_modules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('custom_field_id')->constrained();
            $table->enum('module', ["sales_invoice","quotation","sales_order","credit_note","customer_payment","quick_receipt","purchase_order","purchase_bill","expense","debit_note","supplier_payment","quick_payment","journal_voucher","cash_transfer","production_order","production_journal","contact","lead","deal","crm_activity","product","employee","project"]);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_field_modules');
    }
};
