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

        Schema::create('proforma_invoice_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('proforma_invoice_id')->constrained();
            $table->foreignUuid('product_id')->nullable()->constrained();
            $table->string('custom_product_name', 180)->nullable();
            $table->string('description', 200)->nullable();
            $table->decimal('qty', 16, 4)->default(0);
            $table->decimal('unit_price', 16, 2)->default(0);
            $table->decimal('discount_percent', 8, 4)->default(0);
            $table->foreignUuid('tax_rate_id')->nullable()->constrained();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->decimal('tax_amount', 16, 2)->default(0);
            $table->json('tax_breakup')->nullable();
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
        Schema::dropIfExists('proforma_invoice_lines');
    }
};
