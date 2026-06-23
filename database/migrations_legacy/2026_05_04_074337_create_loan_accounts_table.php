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

        Schema::create('loan_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('bank_name', 150)->nullable();
            $table->string('loan_number', 80)->nullable();
            $table->text('description')->nullable();
            $table->decimal('opening_balance', 18, 6)->default(0);
            $table->decimal('current_balance', 18, 6)->default(0);
            $table->date('balance_as_of')->nullable();
            $table->foreignUuid('loan_received_in_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('related_account_id')->nullable()->constrained('accounts');
            $table->decimal('interest_rate_per_annum', 8, 4)->default(0);
            $table->unsignedSmallInteger('duration_in_month')->default(0);
            $table->decimal('processing_fee', 18, 6)->default(0);
            $table->foreignUuid('processing_fee_paid_from_account_id')->nullable()->constrained('accounts');
            $table->enum('status', ["active","closed","settled","cancelled"])->default('active');
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
        Schema::dropIfExists('loan_accounts');
    }
};
