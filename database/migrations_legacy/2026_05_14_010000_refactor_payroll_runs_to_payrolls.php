<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payroll_runs') && ! Schema::hasTable('payrolls')) {
            Schema::rename('payroll_runs', 'payrolls');
        }

        if (Schema::hasTable('payrolls')) {
            Schema::table('payrolls', function (Blueprint $table) {
                if (! Schema::hasColumn('payrolls', 'payroll_number')) {
                    $table->string('payroll_number', 40)->nullable()->unique()->after('branch_id');
                }
                if (! Schema::hasColumn('payrolls', 'source_account_id')) {
                    $table->foreignUuid('source_account_id')->nullable()->after('exchange_rate')->constrained('accounts')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'total_earnings')) {
                    $table->decimal('total_earnings', 16, 2)->default(0)->after('total_employees');
                }
                if (! Schema::hasColumn('payrolls', 'total_base_currency_amount')) {
                    $table->decimal('total_base_currency_amount', 16, 2)->default(0)->after('total_net_payable');
                }
                if (! Schema::hasColumn('payrolls', 'processed_by')) {
                    $table->foreignId('processed_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'processed_at')) {
                    $table->timestamp('processed_at')->nullable()->after('processed_by');
                }
                if (! Schema::hasColumn('payrolls', 'reopened_by')) {
                    $table->foreignId('reopened_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'reopened_at')) {
                    $table->timestamp('reopened_at')->nullable()->after('reopened_by');
                }
            });

            DB::table('payrolls')
                ->whereNull('payroll_number')
                ->update(['payroll_number' => DB::raw('run_number')]);

            if (Schema::hasColumn('payrolls', 'total_gross')) {
                DB::table('payrolls')
                    ->where('total_earnings', 0)
                    ->update(['total_earnings' => DB::raw('total_gross')]);
            }

            try {
                DB::statement("ALTER TABLE payrolls MODIFY status ENUM('draft','generated','approved','processed','paid','locked','void') NOT NULL DEFAULT 'draft'");
            } catch (\Throwable $e) {
                //
            }
        }

        if (Schema::hasTable('payslips')) {
            Schema::table('payslips', function (Blueprint $table) {
                if (! Schema::hasColumn('payslips', 'payroll_id')) {
                    $table->foreignUuid('payroll_id')->nullable()->after('id')->constrained('payrolls')->nullOnDelete();
                }
            });

            if (Schema::hasColumn('payslips', 'payroll_run_id')) {
                DB::table('payslips')
                    ->whereNull('payroll_id')
                    ->update(['payroll_id' => DB::raw('payroll_run_id')]);
            }

            try {
                DB::statement("ALTER TABLE payslips MODIFY status ENUM('draft','generated','approved','processed','paid','locked','void') NOT NULL DEFAULT 'draft'");
            } catch (\Throwable $e) {
                //
            }
        }

        Schema::create('payroll_additions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payroll_id')->constrained('payrolls')->cascadeOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('salary_components')->nullOnDelete();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->enum('applicability_type', ['all_employees', 'selected_employees'])->default('all_employees');
            $table->json('selected_employee_ids')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['payroll_id']);
        });

        Schema::create('payroll_deductions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payroll_id')->constrained('payrolls')->cascadeOnDelete();
            $table->foreignUuid('component_id')->nullable()->constrained('salary_components')->nullOnDelete();
            $table->string('name');
            $table->decimal('amount', 16, 2);
            $table->enum('calculation_type', ['fixed', 'percentage'])->default('fixed');
            $table->enum('applicability_type', ['all_employees', 'selected_employees'])->default('all_employees');
            $table->json('selected_employee_ids')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['payroll_id']);
        });

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'payroll_account_id')) {
                    $table->foreignUuid('payroll_account_id')->nullable()->after('weekly_holiday_id')->constrained('accounts')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('journal_voucher_lines')) {
            Schema::table('journal_voucher_lines', function (Blueprint $table) {
                if (! Schema::hasColumn('journal_voucher_lines', 'account_id')) {
                    $table->foreignUuid('account_id')->nullable()->after('journal_voucher_id')->constrained('accounts')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('payroll_payments')) {
            Schema::table('payroll_payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll_payments', 'payroll_id')) {
                    $table->foreignUuid('payroll_id')->nullable()->after('id')->constrained('payrolls')->nullOnDelete();
                }
            });

            if (Schema::hasColumn('payroll_payments', 'payroll_run_id')) {
                DB::table('payroll_payments')
                    ->whereNull('payroll_id')
                    ->update(['payroll_id' => DB::raw('payroll_run_id')]);
            }
        }

        if (Schema::hasTable('payslip_lines')) {
            try {
                DB::statement("ALTER TABLE payslip_lines MODIFY source ENUM('salary_structure','payroll_addition','payroll_deduction','payslip_manual_addition','payslip_manual_deduction','attendance','overtime','tax','benefit','reimbursement','manual','addition','deduction') NOT NULL");
            } catch (\Throwable $e) {
                //
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_deductions');
        Schema::dropIfExists('payroll_additions');
    }
};
