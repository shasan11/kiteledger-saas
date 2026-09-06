<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('payroll_settings', 'late_deduction_per_day')) {
            Schema::table('payroll_settings', function (Blueprint $table): void {
                $table->decimal('late_deduction_per_day', 20, 6)->default(0)->after('default_overtime_rate');
            });
        }

        $this->moneyColumns(20, 6);
    }

    public function down(): void
    {
        $this->moneyColumns(16, 2);

        if (Schema::hasColumn('payroll_settings', 'late_deduction_per_day')) {
            Schema::table('payroll_settings', function (Blueprint $table): void {
                $table->dropColumn('late_deduction_per_day');
            });
        }
    }

    private function moneyColumns(int $precision, int $scale): void
    {
        foreach (['employee_additions', 'employee_deductions', 'payroll_additions', 'payroll_deductions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($precision, $scale): void {
                $table->decimal('amount', $precision, $scale)->change();
            });
        }

        Schema::table('employee_reimbursements', function (Blueprint $table) use ($precision, $scale): void {
            $table->decimal('amount', $precision, $scale)->change();
            $table->decimal('base_currency_amount', $precision, $scale)->default(0)->change();
        });
        Schema::table('payroll_payments', function (Blueprint $table) use ($precision, $scale): void {
            $table->decimal('amount', $precision, $scale)->change();
            $table->decimal('base_currency_amount', $precision, $scale)->change();
        });
        Schema::table('payrolls', function (Blueprint $table) use ($precision, $scale): void {
            foreach (['total_gross', 'total_earnings', 'total_deductions', 'total_net_payable', 'total_base_currency_amount'] as $column) {
                $table->decimal($column, $precision, $scale)->default(0)->change();
            }
        });
        Schema::table('payslip_lines', function (Blueprint $table) use ($precision, $scale): void {
            $table->decimal('amount', $precision, $scale)->change();
            $table->decimal('base_currency_amount', $precision, $scale)->default(0)->change();
        });
        Schema::table('payslips', function (Blueprint $table) use ($precision, $scale): void {
            foreach (['salary', 'hourly_salary', 'salary_payable', 'bonus', 'deduction', 'total_payable', 'gross_earnings', 'total_deductions', 'employer_contributions', 'net_payable', 'base_currency_amount'] as $column) {
                $table->decimal($column, $precision, $scale)->default(0)->change();
            }
        });
        Schema::table('salary_structure_lines', function (Blueprint $table) use ($precision, $scale): void {
            $table->decimal('amount', $precision, $scale)->default(0)->change();
        });
        Schema::table('salary_structures', function (Blueprint $table) use ($precision, $scale): void {
            $table->decimal('basic_salary', $precision, $scale)->change();
            $table->decimal('gross_salary', $precision, $scale)->default(0)->change();
        });
    }
};
