<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_sale_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pos_sale_id')->constrained('pos_sales');
            $table->foreignUuid('product_id')->nullable()->constrained('products');
            $table->string('product_name', 180);
            $table->string('product_code', 80)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->decimal('qty', 16, 4)->default(1);
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->decimal('discount_percent', 8, 4)->default(0);
            $table->decimal('discount_amount', 16, 2)->default(0);
            $table->foreignUuid('tax_rate_id')->nullable()->constrained('tax_rates');
            $table->decimal('tax_amount', 16, 2)->default(0);
            $table->decimal('line_total', 16, 2)->default(0);
            $table->decimal('returned_qty', 16, 4)->default(0);
            $table->string('remarks', 200)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['pos_sale_id']);
            $table->index(['product_id']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sale_lines');
    }
};
