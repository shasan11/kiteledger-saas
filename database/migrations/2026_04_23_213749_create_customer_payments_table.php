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

        Schema::create('customer_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained();
            $table->string('payment_no', 40)->unique();
            $table->date('payment_date');
            $table->foreignUuid('contact_id')->constrained();
            $table->foreignUuid('bank_account_id')->nullable()->constrained();
            $table->foreignUuid('currency_id')->nullable()->constrained();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->decimal('amount', 16, 2)->default(0);
            $table->string('payment_method', 20)->nullable();
            $table->foreignUuid('bank_charges_account_id')->nullable()->constrained('chart_of_accounts');
            $table->decimal('bank_charges', 16, 2)->default(0);
            $table->foreignUuid('tds_charges_account_id')->nullable()->constrained('chart_of_accounts');
            $table->string('tds_type', 20)->nullable();
            $table->decimal('tds_charges', 16, 2)->default(0);
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ["draft","posted","cancelled"])->default('draft');
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(true);
            $table->boolean('voided')->default(false);
            $table->text('voided_reason')->nullable();
            $table->date('voided_date')->nullable();
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_payments');
    }
};
