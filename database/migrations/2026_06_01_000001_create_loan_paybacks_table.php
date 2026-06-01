<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('loan_paybacks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('loan_account_id')->constrained('loan_accounts')->cascadeOnDelete();
            $table->date('payback_date');
            $table->decimal('amount', 18, 6)->default(0);
            // The bank/cash account the repayment is paid FROM
            $table->foreignUuid('paid_from_account_id')->constrained('accounts');
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            // System-generated JV that posts this payback to the ledger
            $table->foreignUuid('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_paybacks');
    }
};
