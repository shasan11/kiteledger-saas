<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payrolls')) {
            try {
                DB::statement("ALTER TABLE payrolls MODIFY status ENUM('draft','previewed','generated','approved','processed','paid','locked','void','voided','reopened') NOT NULL DEFAULT 'draft'");
            } catch (Throwable) {
                //
            }
        }

        if (Schema::hasTable('payslips')) {
            try {
                DB::statement("ALTER TABLE payslips MODIFY status ENUM('draft','generated','approved','paid','processed','locked','void','voided') NOT NULL DEFAULT 'draft'");
            } catch (Throwable) {
                //
            }
        }

        if (Schema::hasTable('payroll_settings')) {
            Schema::table('payroll_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll_settings', 'standard_working_days_mode')) {
                    $table->string('standard_working_days_mode', 40)->default('working_days_only')->after('daily_rate_basis');
                }
                if (! Schema::hasColumn('payroll_settings', 'default_monthly_working_days')) {
                    $table->unsignedTinyInteger('default_monthly_working_days')->default(30)->after('standard_working_days_mode');
                }
                if (! Schema::hasColumn('payroll_settings', 'overtime_enabled')) {
                    $table->boolean('overtime_enabled')->default(true)->after('default_overtime_rate');
                }
                if (! Schema::hasColumn('payroll_settings', 'late_deduction_enabled')) {
                    $table->boolean('late_deduction_enabled')->default(false)->after('overtime_enabled');
                }
                if (! Schema::hasColumn('payroll_settings', 'unpaid_leave_deduction_enabled')) {
                    $table->boolean('unpaid_leave_deduction_enabled')->default(true)->after('late_deduction_enabled');
                }
                if (! Schema::hasColumn('payroll_settings', 'auto_post_journal_voucher')) {
                    $table->boolean('auto_post_journal_voucher')->default(false)->after('unpaid_leave_deduction_enabled');
                }
                if (! Schema::hasColumn('payroll_settings', 'require_approval_before_payment')) {
                    $table->boolean('require_approval_before_payment')->default(true)->after('auto_post_journal_voucher');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payroll_settings')) {
            Schema::table('payroll_settings', function (Blueprint $table) {
                foreach ([
                    'standard_working_days_mode',
                    'default_monthly_working_days',
                    'overtime_enabled',
                    'late_deduction_enabled',
                    'unpaid_leave_deduction_enabled',
                    'auto_post_journal_voucher',
                    'require_approval_before_payment',
                ] as $column) {
                    if (Schema::hasColumn('payroll_settings', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
