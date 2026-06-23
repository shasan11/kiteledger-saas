<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('production_orders')) {
            Schema::create('production_orders', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained();
                $table->string('code', 60)->nullable()->unique();
                $table->date('date');
                $table->string('reference', 120)->nullable();
                $table->uuid('bill_of_material_id')->nullable();
                $table->foreignUuid('finished_product_id')->constrained('products');
                $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses');
                $table->foreignUuid('product_unit_id')->nullable()->constrained('product_units');
                $table->decimal('output_quantity', 18, 4);
                $table->decimal('total_raw_material_cost', 18, 6)->default(0);
                $table->decimal('total_expense_cost', 18, 6)->default(0);
                $table->decimal('total_byproduct_cost', 18, 6)->default(0);
                $table->decimal('total_finished_goods_cost', 18, 6)->default(0);
                $table->decimal('total_production_cost', 18, 6)->default(0);
                $table->decimal('finished_goods_unit_cost', 18, 6)->default(0);
                $table->string('status', 30)->default('draft');
                $table->boolean('approved')->default(false);
                $table->timestamp('approved_at')->nullable();
                $table->foreignId('approved_by_id')->nullable()->constrained('users');
                $table->boolean('void')->default(false);
                $table->timestamp('voided_at')->nullable();
                $table->foreignId('voided_by_id')->nullable()->constrained('users');
                $table->string('voided_reason', 500)->nullable();
                $table->text('notes')->nullable();
                $table->boolean('active')->default(true);
                $table->boolean('is_system_generated')->default(false);
                $table->boolean('stock_posted')->default(false);
                $table->timestamp('stock_posted_at')->nullable();
                $table->foreignUuid('journal_voucher_id')->nullable()->constrained('journal_vouchers');
                $table->foreignId('user_add_id')->nullable()->constrained('users');
                $table->timestamps();

                $table->index(['branch_id', 'date']);
                $table->index(['status', 'approved', 'void']);
                $table->index(['finished_product_id', 'warehouse_id']);
            });
        }

        if (!Schema::hasTable('production_order_raw_materials')) {
            Schema::create('production_order_raw_materials', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_order_id')->constrained('production_orders')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses');
                $table->foreignUuid('product_unit_id')->nullable()->constrained('product_units');
                $table->decimal('quantity', 18, 4);
                $table->decimal('unit_cost', 18, 6)->default(0);
                $table->decimal('total_cost', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_order_id', 'product_id'], 'po_raw_order_product_index');
            });
        }

        if (!Schema::hasTable('production_order_byproducts')) {
            Schema::create('production_order_byproducts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_order_id')->constrained('production_orders')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->foreignUuid('warehouse_id')->nullable()->constrained('warehouses');
                $table->foreignUuid('product_unit_id')->nullable()->constrained('product_units');
                $table->decimal('quantity', 18, 4);
                $table->decimal('cost_share_percent', 9, 4)->default(0);
                $table->decimal('allocated_cost', 18, 6)->default(0);
                $table->decimal('unit_cost', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_order_id', 'product_id'], 'po_byproduct_order_product_index');
            });
        }

        if (!Schema::hasTable('production_order_expenses')) {
            Schema::create('production_order_expenses', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_order_id')->constrained('production_orders')->cascadeOnDelete();
                $table->foreignUuid('expense_account_id')->nullable()->constrained('chart_of_accounts');
                $table->string('name', 120);
                $table->decimal('amount', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_order_id', 'expense_account_id'], 'po_expense_order_account_index');
            });
        }

        if (!Schema::hasTable('inventory_ledgers')) {
            Schema::create('inventory_ledgers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained();
                $table->foreignUuid('warehouse_id')->constrained('warehouses');
                $table->foreignUuid('product_id')->constrained('products');
                $table->date('transaction_date');
                $table->string('source_type', 80);
                $table->uuid('source_id');
                $table->string('source_no', 80)->nullable();
                $table->string('movement_type', 20);
                $table->decimal('qty_in', 18, 4)->default(0);
                $table->decimal('qty_out', 18, 4)->default(0);
                $table->decimal('unit_cost', 18, 6)->default(0);
                $table->decimal('value_in', 18, 6)->default(0);
                $table->decimal('value_out', 18, 6)->default(0);
                $table->decimal('balance_qty', 18, 4)->default(0);
                $table->decimal('balance_value', 18, 6)->default(0);
                $table->string('description', 255)->nullable();
                $table->boolean('is_reversal')->default(false);
                $table->uuid('reverses_ledger_id')->nullable();
                $table->timestamps();

                $table->index(['source_type', 'source_id']);
                $table->index(['warehouse_id', 'product_id', 'transaction_date']);
                $table->index(['branch_id', 'transaction_date']);
            });
        } elseif (Schema::hasColumn('inventory_ledgers', 'movement_type')) {
            Schema::table('inventory_ledgers', function (Blueprint $table) {
                $table->string('movement_type', 80)->change();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('production_order_expenses');
        Schema::dropIfExists('production_order_byproducts');
        Schema::dropIfExists('production_order_raw_materials');
        Schema::dropIfExists('production_orders');
    }
};
