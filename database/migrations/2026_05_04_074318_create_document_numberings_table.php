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

        Schema::create('document_numberings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('document_type', ["cash_transfer","credit_note","debit_note","expense","inventory_adjustment","invoice","journal_voucher","payment","production_journal","production_order","purchase_bill","purchase_order","quotation","receipt","sales_order","sales_return","warehouse_transfer","payroll","deduction","increment","contact","lead","deal","product","bank_account","capital","cash","current_asset","current_liability","direct_expense","direct_income","indirect_expense","indirect_income","non_current_asset","non_current_liability","reserve_surplus","loan_account","loan_topup","loan_charge"]);
            $table->string('prefix', 20)->nullable();
            $table->unsignedBigInteger('next_number')->default(1);
            $table->enum('type_of_account', ["auto_numbering","manual_numbering"])->default('auto_numbering');
            $table->boolean('reset_every_fiscal_year')->default(false);
            $table->boolean('add_fiscal_year_in_code')->default(false);
            $table->boolean('enable_fiscal_year_next_number')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_numberings');
    }
};
