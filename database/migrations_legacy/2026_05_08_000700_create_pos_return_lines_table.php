<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_return_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pos_return_id')->constrained('pos_returns');
            $table->foreignUuid('pos_sale_line_id')->constrained('pos_sale_lines');
            $table->foreignUuid('product_id')->nullable()->constrained('products');
            $table->decimal('qty', 16, 4)->default(0);
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->decimal('tax_amount', 16, 2)->default(0);
            $table->decimal('line_total', 16, 2)->default(0);
            $table->string('remarks', 200)->nullable();
            $table->timestamps();

            $table->index(['pos_return_id']);
            $table->index(['pos_sale_line_id']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_return_lines');
    }
};
