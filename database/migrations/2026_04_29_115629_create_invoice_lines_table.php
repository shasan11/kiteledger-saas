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

        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained();
            $table->foreignUuid('product_variant_id')->nullable()->constrained();
            $table->string('custom_product_name', 180)->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default(0);
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->decimal('discount_percent', 8, 4)->default(0);
            $table->foreignUuid('tax_rate_id')->nullable()->constrained();
            $table->decimal('tax_amount', 16, 2)->default(0);
            $table->decimal('line_total', 16, 2)->default(0);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_lines');
    }
};
