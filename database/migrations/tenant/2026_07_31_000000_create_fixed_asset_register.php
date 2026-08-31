<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixed_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('asset_code', 40)->unique();
            $table->string('name');
            $table->uuid('branch_id')->nullable();
            $table->date('purchase_date');
            $table->date('in_service_date');
            $table->decimal('cost', 18, 2);
            $table->decimal('salvage_value', 18, 2)->default(0);
            $table->unsignedInteger('useful_life_months');
            $table->string('depreciation_method')->default('straight_line');
            $table->decimal('accumulated_depreciation', 18, 2)->default(0);
            $table->decimal('book_value', 18, 2);
            $table->uuid('asset_account_id');
            $table->uuid('accumulated_depreciation_account_id');
            $table->uuid('depreciation_expense_account_id');
            $table->string('status')->default('active')->index();
            $table->date('disposed_at')->nullable();
            $table->decimal('disposal_proceeds', 18, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('asset_account_id')->references('id')->on('accounts')->restrictOnDelete();
            $table->foreign('accumulated_depreciation_account_id')->references('id')->on('accounts')->restrictOnDelete();
            $table->foreign('depreciation_expense_account_id')->references('id')->on('accounts')->restrictOnDelete();
        });
        Schema::create('fixed_asset_depreciations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->date('depreciation_date');
            $table->string('depreciation_period', 7);
            $table->decimal('amount', 18, 2);
            $table->uuid('journal_voucher_id')->nullable();
            $table->timestamps();
            $table->unique(['fixed_asset_id', 'depreciation_period'], 'fixed_asset_period_unique');
            $table->index('depreciation_date');
            $table->foreign('journal_voucher_id')->references('id')->on('journal_vouchers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_asset_depreciations');
        Schema::dropIfExists('fixed_assets');
    }
};
