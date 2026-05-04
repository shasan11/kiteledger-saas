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

        Schema::create('customer_payment_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_payment_id')->constrained();
            $table->foreignUuid('invoice_id')->constrained();
            $table->decimal('allocated_amount', 16, 2)->default(0);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_payment_lines');
    }
};
