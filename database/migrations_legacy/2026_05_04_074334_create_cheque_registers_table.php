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

        Schema::create('cheque_registers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->string('cheque_no', 80);
            $table->date('cheque_date');
            $table->date('issued_date');
            $table->date('received_date')->nullable();
            $table->string('payee_name', 150)->nullable();
            $table->date('cleared_date')->nullable();
            $table->enum('direction', ["issued","received"])->default('issued');
            $table->foreignUuid('account_id')->constrained();
            $table->foreignUuid('related_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('receiver_related_account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 16, 2)->default(0);
            $table->enum('status', ["pending","cleared","bounced","cancelled"])->default('pending');
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('void')->default(false);
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default(1);
            $table->decimal('total', 18, 6)->default(0);
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
        Schema::dropIfExists('cheque_registers');
    }
};
