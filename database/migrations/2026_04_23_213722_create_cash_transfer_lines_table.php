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

        Schema::create('cash_transfer_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_transfer_id')->constrained();
            $table->foreignUuid('to_bank_account_id')->constrained('bank_accounts');
            $table->decimal('exchange_rate_to_default', 16, 6)->default(1);
            $table->decimal('amount', 16, 2)->default(0);
            $table->string('description', 200)->nullable();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_transfer_lines');
    }
};
