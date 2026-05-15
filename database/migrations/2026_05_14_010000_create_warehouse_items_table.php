<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('warehouse_id')->constrained();
            $table->foreignUuid('product_id')->constrained();
            $table->decimal('qty_on_hand', 18, 4)->default(0);
            $table->decimal('avg_cost', 18, 6)->nullable()->default(0);
            $table->decimal('total_value', 18, 6)->nullable()->default(0);
            $table->decimal('reorder_level', 18, 4)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['warehouse_id', 'product_id'], 'warehouse_items_warehouse_product_unique');
            $table->index(['branch_id', 'warehouse_id']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_items');
    }
};
