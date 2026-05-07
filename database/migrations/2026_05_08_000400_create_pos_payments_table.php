<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pos_sale_id')->constrained('pos_sales');
            $table->dateTime('payment_date');
            $table->enum('payment_method', ['cash', 'card', 'online', 'wallet', 'bank_transfer', 'credit', 'mixed'])->default('cash');
            $table->foreignUuid('account_id')->nullable()->constrained('accounts');
            $table->decimal('amount', 16, 2)->default(0);
            $table->string('reference', 120)->nullable();
            $table->string('card_last_four', 4)->nullable();
            $table->string('transaction_no', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['pos_sale_id']);
            $table->index(['payment_method']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_payments');
    }
};
