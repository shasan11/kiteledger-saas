<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_components', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code', 40)->unique();
            $table->enum('type', ['earning', 'deduction', 'employer_contribution']);
            $table->enum('calculation_type', ['fixed', 'percentage', 'formula', 'manual'])->default('fixed');
            $table->boolean('taxable')->default(false);
            $table->boolean('affects_net_salary')->default(true);
            $table->foreignUuid('accounting_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignUuid('currency_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('daily_rate_basis', ['working_days', 'calendar_days'])->default('working_days');
            $table->enum('rounding_method', ['nearest', 'floor', 'ceil'])->default('nearest');
            $table->unsignedTinyInteger('currency_precision')->default(2);
            $table->decimal('default_overtime_rate', 16, 4)->default(0);
            $table->foreignUuid('salary_expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('salary_payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('tax_payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('benefit_payable_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignUuid('bank_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->boolean('allow_multiple_runs')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique('branch_id');
        });

        Schema::create('salary_structures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->decimal('basic_salary', 16, 2);
            $table->decimal('gross_salary', 16, 2)->default(0);
            $table->foreignUuid('currency_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'active']);
            $table->index(['branch_id', 'active']);
            $table->index(['effective_from', 'effective_to']);
        });

        Schema::create('salary_structure_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('salary_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('component_id')->constrained('salary_components')->restrictOnDelete();
            $table->decimal('amount', 16, 2)->default(0);
            $table->decimal('percentage', 8, 4)->nullable();
            $table->text('formula')->nullable();
            $table->enum('calculation_type', ['fixed', 'percentage', 'formula', 'manual'])->default('fixed');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('employee_additions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('component_id')->constrained('salary_components')->restrictOnDelete();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->boolean('recurring')->default(false);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->uuid('consumed_payslip_id')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'active']);
            $table->index(['branch_id', 'active']);
        });

        Schema::create('employee_deductions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('component_id')->constrained('salary_components')->restrictOnDelete();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->boolean('recurring')->default(false);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->uuid('consumed_payslip_id')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'active']);
            $table->index(['branch_id', 'active']);
        });

        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->date('start_date');
            $table->date('end_date');
            $table->foreignUuid('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('status', ['open', 'closed', 'locked'])->default('open');
            $table->timestamps();

            $table->unique(['month', 'year', 'branch_id']);
            $table->index(['status', 'month', 'year']);
        });

        Schema::create('attendance_summaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('payroll_period_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('total_working_days', 8, 2)->default(0);
            $table->decimal('present_days', 8, 2)->default(0);
            $table->decimal('absent_days', 8, 2)->default(0);
            $table->decimal('paid_leave_days', 8, 2)->default(0);
            $table->decimal('unpaid_leave_days', 8, 2)->default(0);
            $table->decimal('half_days', 8, 2)->default(0);
            $table->unsignedInteger('late_days')->default(0);
            $table->decimal('overtime_hours', 10, 2)->default(0);
            $table->decimal('payable_days', 8, 2)->default(0);
            $table->boolean('locked')->default(false);
            $table->timestamps();

            $table->unique(['employee_id', 'payroll_period_id']);
            $table->index(['branch_id', 'payroll_period_id']);
        });

        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payroll_period_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('run_number', 40)->unique();
            $table->enum('status', ['draft', 'generated', 'reviewed', 'approved', 'paid', 'locked', 'void'])->default('draft');
            $table->unsignedInteger('total_employees')->default(0);
            $table->decimal('total_gross', 16, 2)->default(0);
            $table->decimal('total_deductions', 16, 2)->default(0);
            $table->decimal('total_net_payable', 16, 2)->default(0);
            $table->foreignUuid('currency_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignUuid('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'branch_id']);
            $table->index(['status', 'branch_id']);
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->foreignUuid('payroll_run_id')->nullable()->after('id')->constrained('payroll_runs')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->after('payroll_run_id')->constrained('users')->nullOnDelete();
            $table->string('payslip_number', 60)->nullable()->unique()->after('branch_id');
            $table->enum('status', ['draft', 'generated', 'reviewed', 'approved', 'paid', 'locked', 'void'])->default('draft')->after('payslip_number');
            $table->decimal('gross_earnings', 16, 2)->default(0)->after('status');
            $table->decimal('total_deductions', 16, 2)->default(0)->after('gross_earnings');
            $table->decimal('employer_contributions', 16, 2)->default(0)->after('total_deductions');
            $table->decimal('net_payable', 16, 2)->default(0)->after('employer_contributions');
            $table->foreignUuid('currency_id')->nullable()->after('net_payable')->constrained()->nullOnDelete();
            $table->decimal('exchange_rate', 16, 6)->default(1)->after('currency_id');
            $table->decimal('base_currency_amount', 16, 2)->default(0)->after('exchange_rate');
            $table->decimal('payable_days', 8, 2)->default(0)->after('base_currency_amount');
            $table->decimal('total_working_days', 8, 2)->default(0)->after('payable_days');
            $table->decimal('unpaid_leave_days', 8, 2)->default(0)->after('total_working_days');
            $table->decimal('overtime_hours', 10, 2)->default(0)->after('unpaid_leave_days');
            $table->foreignUuid('journal_voucher_id')->nullable()->after('overtime_hours')->constrained('journal_vouchers')->nullOnDelete();
            $table->string('payment_reference')->nullable()->after('journal_voucher_id');
            $table->text('remarks')->nullable()->after('payment_reference');

            $table->unique(['payroll_run_id', 'employee_id']);
            $table->index(['employee_id', 'status']);
            $table->index(['payroll_run_id', 'status']);
        });

        Schema::create('payslip_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payslip_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('salary_components')->nullOnDelete();
            $table->enum('type', ['earning', 'deduction', 'employer_contribution']);
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->decimal('base_currency_amount', 16, 2)->default(0);
            $table->enum('calculation_type', ['fixed', 'percentage', 'formula', 'manual'])->default('fixed');
            $table->enum('source', ['salary_structure', 'attendance', 'manual', 'addition', 'deduction', 'tax', 'benefit', 'overtime', 'reimbursement']);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['payslip_id', 'type']);
        });

        Schema::create('tax_slabs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('country', 100);
            $table->string('fiscal_year', 40);
            $table->decimal('income_from', 16, 2)->default(0);
            $table->decimal('income_to', 16, 2)->nullable();
            $table->decimal('rate', 8, 4)->default(0);
            $table->decimal('fixed_amount', 16, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['country', 'fiscal_year', 'active']);
        });

        Schema::create('benefit_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code', 40)->unique();
            $table->decimal('employee_rate', 8, 4)->default(0);
            $table->decimal('employer_rate', 8, 4)->default(0);
            $table->string('calculation_base', 60)->default('gross');
            $table->decimal('max_limit', 16, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->foreignUuid('accounting_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('approval_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('approvable_type');
            $table->uuid('approvable_id');
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->string('action');
            $table->text('reason')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['approvable_type', 'approvable_id']);
        });

        Schema::create('payroll_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payroll_run_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('payslip_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 16, 2);
            $table->foreignUuid('currency_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->decimal('base_currency_amount', 16, 2);
            $table->string('payment_method', 60)->default('bank');
            $table->foreignUuid('bank_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->date('payment_date');
            $table->string('reference_number')->nullable();
            $table->enum('status', ['pending', 'paid', 'failed', 'reversed'])->default('pending');
            $table->text('remarks')->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->timestamps();

            $table->index(['payroll_run_id', 'status']);
            $table->index(['employee_id', 'status']);
        });

        Schema::create('employee_reimbursements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->string('expense_category', 120);
            $table->decimal('amount', 16, 2);
            $table->foreignUuid('currency_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->decimal('base_currency_amount', 16, 2)->default(0);
            $table->text('description')->nullable();
            $table->string('attachment')->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'paid', 'void'])->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('void_reason')->nullable();
            $table->string('payment_reference')->nullable();
            $table->foreignUuid('journal_voucher_id')->nullable()->constrained('journal_vouchers')->nullOnDelete();
            $table->foreignUuid('payroll_run_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('payslip_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('include_in_payroll')->default(true);
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index(['branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_reimbursements');
        Schema::dropIfExists('payroll_payments');
        Schema::dropIfExists('approval_logs');
        Schema::dropIfExists('benefit_rules');
        Schema::dropIfExists('tax_slabs');
        Schema::dropIfExists('payslip_lines');

        Schema::table('payslips', function (Blueprint $table) {
            $table->dropUnique(['payroll_run_id', 'employee_id']);
            $table->dropColumn([
                'payroll_run_id',
                'employee_id',
                'payslip_number',
                'status',
                'gross_earnings',
                'total_deductions',
                'employer_contributions',
                'net_payable',
                'currency_id',
                'exchange_rate',
                'base_currency_amount',
                'payable_days',
                'total_working_days',
                'unpaid_leave_days',
                'overtime_hours',
                'journal_voucher_id',
                'payment_reference',
                'remarks',
            ]);
        });

        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('attendance_summaries');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('employee_deductions');
        Schema::dropIfExists('employee_additions');
        Schema::dropIfExists('salary_structure_lines');
        Schema::dropIfExists('salary_structures');
        Schema::dropIfExists('payroll_settings');
        Schema::dropIfExists('salary_components');
    }
};
