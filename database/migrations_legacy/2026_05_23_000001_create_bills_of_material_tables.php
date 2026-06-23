<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('bills_of_material')) {
            Schema::create('bills_of_material', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained();
                $table->uuid('fiscal_year_id')->nullable();
                $table->string('code', 60)->nullable()->unique();
                $table->date('date');
                $table->string('reference', 120)->nullable();
                $table->foreignUuid('product_id')->constrained('products');
                $table->decimal('output_quantity', 18, 4)->default(1);
                $table->string('output_unit_code', 20)->nullable();
                $table->boolean('manufacture_on_every_sale')->default(false);
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('draft');
                $table->boolean('active')->default(true);
                $table->boolean('approved')->default(false);
                $table->timestamp('approved_at')->nullable();
                $table->foreignId('approved_by_id')->nullable()->constrained('users');
                $table->foreignId('user_add_id')->nullable()->constrained('users');
                $table->timestamps();

                $table->index(['branch_id', 'date']);
                $table->index(['product_id', 'active']);
            });
        }

        if (!Schema::hasTable('bill_of_material_raw_materials')) {
            Schema::create('bill_of_material_raw_materials', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('bill_of_material_id')->constrained('bills_of_material')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->decimal('quantity', 18, 4)->default(0);
                $table->string('unit_code', 20)->nullable();
                $table->decimal('wastage_percent', 9, 4)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['bill_of_material_id', 'product_id'], 'bom_raw_bom_product_index');
            });
        }

        if (!Schema::hasTable('bill_of_material_by_products')) {
            Schema::create('bill_of_material_by_products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('bill_of_material_id')->constrained('bills_of_material')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->decimal('cost_percent', 9, 4)->default(0);
                $table->decimal('quantity', 18, 4)->default(0);
                $table->string('unit_code', 20)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['bill_of_material_id', 'product_id'], 'bom_byproduct_bom_product_index');
            });
        }

        if (!Schema::hasTable('bill_of_material_expenses')) {
            Schema::create('bill_of_material_expenses', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('bill_of_material_id')->constrained('bills_of_material')->cascadeOnDelete();
                $table->uuid('cost_term_id')->nullable();
                $table->decimal('amount', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['bill_of_material_id'], 'bom_expense_bom_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_of_material_expenses');
        Schema::dropIfExists('bill_of_material_by_products');
        Schema::dropIfExists('bill_of_material_raw_materials');
        Schema::dropIfExists('bills_of_material');
    }
};
