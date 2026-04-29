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

        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained();
            $table->enum('type', ['bank', 'cash']);
            $table->string('display_name', 150);
            $table->string('code', 30);
            $table->foreignUuid('currency_id')->constrained();
            $table->text('description')->nullable();
            $table->string('bank_name', 150)->nullable();
            $table->string('account_name', 150)->nullable();
            $table->string('account_number', 80)->nullable();
            $table->string('account_type', 50)->nullable();
            $table->string('swift_code', 50)->nullable();
            $table->foreignUuid('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->decimal('opening_balance', 16, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
