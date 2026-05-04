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

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('parent_id')->nullable()->constrained('products');
            $table->foreignUuid('product_category_id')->nullable()->constrained();
            $table->foreignUuid('product_tax_category_id')->nullable()->constrained();
            $table->string('name', 180);
            $table->string('code', 60)->nullable();
            $table->string('sku', 80)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->text('description')->nullable();
            $table->foreignUuid('product_unit_id')->nullable()->constrained();
            $table->foreignUuid('tax_class_id')->nullable()->constrained();
            $table->enum('product_type', ["simple","variant_parent","variant"])->default('simple');
            $table->foreignUuid('sales_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('purchase_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('sales_return_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('purchase_return_account_id')->nullable()->constrained('accounts');
            $table->enum('valuation_method', ["standard","average_cost","first_in_first_out","last_in_first_out"])->default('standard');
            $table->decimal('reorder_level', 16, 4)->default(0);
            $table->decimal('purchase_price', 16, 2)->default(0);
            $table->decimal('selling_price', 16, 2)->default(0);
            $table->boolean('track_inventory')->default(true);
            $table->boolean('allow_sale')->default(true);
            $table->boolean('allow_purchase')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
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
        Schema::dropIfExists('products');
    }
};
