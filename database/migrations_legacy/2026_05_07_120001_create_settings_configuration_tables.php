<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 80);
            $table->string('code', 40)->nullable()->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['DRAFT', 'ACTIVE', 'CLOSED'])->default('DRAFT');
            $table->date('lock_date')->nullable();
            $table->boolean('is_current')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('approval_workflows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('module', 80);
            $table->string('document_type', 80);
            $table->boolean('approval_required')->default(false);
            $table->enum('approval_mode', ['SINGLE', 'MULTI_STEP'])->default('SINGLE');
            $table->decimal('minimum_amount', 18, 2)->nullable();
            $table->foreignUuid('approver_role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('steps')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['module', 'document_type']);
        });

        Schema::create('email_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('module', 80);
            $table->string('template_key', 120)->unique();
            $table->string('subject', 180);
            $table->longText('body')->nullable();
            $table->json('variables')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('accounting_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('default_cash_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('default_bank_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('accounts_receivable_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('accounts_payable_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('sales_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('purchase_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('sales_return_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('purchase_return_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('tax_payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('tax_receivable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('discount_allowed_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('discount_received_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('rounding_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('payroll_expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('salary_payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('inventory_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('hrm_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->decimal('default_working_hours_per_day', 5, 2)->default(8);
            $table->unsignedTinyInteger('default_working_days_per_week')->default(6);
            $table->unsignedSmallInteger('attendance_grace_period_minutes')->default(10);
            $table->decimal('half_day_threshold_hours', 5, 2)->default(4);
            $table->boolean('overtime_enabled')->default(false);
            $table->decimal('overtime_rate_multiplier', 6, 2)->default(1.5);
            $table->boolean('attendance_correction_enabled')->default(true);
            $table->unsignedTinyInteger('leave_year_start_month')->default(4);
            $table->unsignedTinyInteger('payroll_day')->default(30);
            $table->unsignedSmallInteger('probation_period_days')->default(90);
            $table->json('weekend_days')->nullable();
            $table->boolean('require_leave_approval')->default(true);
            $table->boolean('require_attendance_approval')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('inventory_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('default_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->enum('stock_valuation_method', ['FIFO', 'LIFO', 'WEIGHTED_AVERAGE'])->default('FIFO');
            $table->boolean('negative_stock_allowed')->default(false);
            $table->boolean('low_stock_alert_enabled')->default(true);
            $table->unsignedInteger('default_low_stock_threshold')->default(10);
            $table->string('product_code_prefix', 20)->default('PROD');
            $table->boolean('auto_generate_product_code')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sales_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('default_customer_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('default_sales_tax_id')->nullable()->constrained('tax_rates')->nullOnDelete();
            $table->unsignedSmallInteger('quotation_validity_days')->default(15);
            $table->unsignedSmallInteger('invoice_due_days')->default(30);
            $table->boolean('require_sales_order_approval')->default(true);
            $table->boolean('allow_negative_receivable')->default(false);
            $table->json('aging_buckets')->nullable();
            $table->boolean('overdue_reminders_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('purchase_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('default_supplier_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('default_purchase_tax_id')->nullable()->constrained('tax_rates')->nullOnDelete();
            $table->unsignedSmallInteger('bill_due_days')->default(30);
            $table->boolean('require_purchase_order_approval')->default(true);
            $table->boolean('require_bill_approval')->default(true);
            $table->json('aging_buckets')->nullable();
            $table->boolean('overdue_reminders_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_configurations');
        Schema::dropIfExists('sales_configurations');
        Schema::dropIfExists('inventory_configurations');
        Schema::dropIfExists('hrm_configurations');
        Schema::dropIfExists('accounting_configurations');
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('approval_workflows');
        Schema::dropIfExists('fiscal_years');
    }
};
