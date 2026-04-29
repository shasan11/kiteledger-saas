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

        Schema::create('inventory_adjustment_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventory_adjustment_id')->constrained();
            $table->foreignUuid('product_variant_id')->constrained();
            $table->enum('adjustment_type', ["increase","decrease"])->default('increase');
            $table->decimal('qty', 16, 4)->default(0);
            $table->decimal('unit_cost', 16, 2)->default(0);
            $table->string('remarks', 200)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_adjustment_lines');
    }
};
