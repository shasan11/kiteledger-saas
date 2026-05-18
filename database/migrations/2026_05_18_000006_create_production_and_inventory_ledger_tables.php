<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('production_cost_terms')) {
            Schema::create('production_cost_terms', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained();
                $table->string('name', 120);
                $table->string('code', 40)->nullable();
                $table->foreignUuid('chart_of_account_id')->nullable()->constrained('chart_of_accounts');
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->unique(['branch_id', 'name'], 'production_cost_terms_branch_name_unique');
                $table->index(['branch_id', 'active']);
            });
        }

        if (!Schema::hasTable('production_journals')) {
            Schema::create('production_journals', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained();
                $table->string('code', 60)->unique();
                $table->date('date');
                $table->string('reference', 120)->nullable();
                $table->foreignUuid('finished_product_id')->constrained('products');
                $table->decimal('output_quantity', 18, 4);
                $table->string('output_unit_code', 20)->nullable();
                $table->foreignUuid('warehouse_id')->constrained('warehouses');
                $table->decimal('raw_material_cost', 18, 6)->default(0);
                $table->decimal('production_expense_amount', 18, 6)->default(0);
                $table->decimal('total_cost_of_production', 18, 6)->default(0);
                $table->decimal('by_product_allocated_cost', 18, 6)->default(0);
                $table->decimal('finished_goods_cost', 18, 6)->default(0);
                $table->decimal('cost_per_unit', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('draft');
                $table->boolean('active')->default(true);
                $table->boolean('approved')->default(false);
                $table->timestamp('approved_at')->nullable();
                $table->foreignId('approved_by_id')->nullable()->constrained('users');
                $table->boolean('stock_posted')->default(false);
                $table->timestamp('stock_posted_at')->nullable();
                $table->boolean('void')->default(false);
                $table->timestamp('voided_at')->nullable();
                $table->foreignId('voided_by_id')->nullable()->constrained('users');
                $table->string('voided_reason', 500)->nullable();
                $table->foreignUuid('journal_voucher_id')->nullable()->constrained('journal_vouchers');
                $table->foreignId('user_add_id')->nullable()->constrained('users');
                $table->timestamps();

                $table->index(['branch_id', 'date']);
                $table->index(['warehouse_id', 'status']);
                $table->index(['finished_product_id', 'status']);
            });
        }

        if (!Schema::hasTable('production_journal_raw_materials')) {
            Schema::create('production_journal_raw_materials', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_journal_id')->constrained('production_journals')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->decimal('quantity', 18, 4);
                $table->string('unit_code', 20)->nullable();
                $table->decimal('rate', 18, 6)->default(0);
                $table->decimal('amount', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_journal_id', 'product_id'], 'pj_raw_journal_product_index');
            });
        }

        if (!Schema::hasTable('production_journal_expenses')) {
            Schema::create('production_journal_expenses', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_journal_id')->constrained('production_journals')->cascadeOnDelete();
                $table->foreignUuid('cost_term_id')->nullable()->constrained('production_cost_terms')->nullOnDelete();
                $table->decimal('amount', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_journal_id', 'cost_term_id'], 'pj_expense_journal_term_index');
            });
        }

        if (!Schema::hasTable('production_journal_by_products')) {
            Schema::create('production_journal_by_products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('production_journal_id')->constrained('production_journals')->cascadeOnDelete();
                $table->foreignUuid('product_id')->constrained('products');
                $table->decimal('cost_percent', 9, 4)->default(0);
                $table->decimal('quantity', 18, 4);
                $table->string('unit_code', 20)->nullable();
                $table->decimal('allocated_cost', 18, 6)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['production_journal_id', 'product_id'], 'pj_byproduct_journal_product_index');
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
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_ledgers');
        Schema::dropIfExists('production_journal_by_products');
        Schema::dropIfExists('production_journal_expenses');
        Schema::dropIfExists('production_journal_raw_materials');
        Schema::dropIfExists('production_journals');
        Schema::dropIfExists('production_cost_terms');
    }
};
