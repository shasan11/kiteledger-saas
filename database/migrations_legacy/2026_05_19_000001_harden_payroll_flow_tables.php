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
            Schema::table('payrolls', function (Blueprint $table) {
                if (! Schema::hasColumn('payrolls', 'payment_journal_voucher_id')) {
                    $table->foreignUuid('payment_journal_voucher_id')->nullable()->after('journal_voucher_id')->constrained('journal_vouchers')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'reversal_journal_voucher_id')) {
                    $table->foreignUuid('reversal_journal_voucher_id')->nullable()->after('payment_journal_voucher_id')->constrained('journal_vouchers')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'payment_reversal_journal_voucher_id')) {
                    $table->foreignUuid('payment_reversal_journal_voucher_id')->nullable()->after('reversal_journal_voucher_id')->constrained('journal_vouchers')->nullOnDelete();
                }
                if (! Schema::hasColumn('payrolls', 'preview_snapshot')) {
                    $table->json('preview_snapshot')->nullable()->after('payment_reversal_journal_voucher_id');
                }
            });
        }

        if (Schema::hasTable('payslips') && ! Schema::hasColumn('payslips', 'calculation_snapshot')) {
            Schema::table('payslips', function (Blueprint $table) {
                $table->json('calculation_snapshot')->nullable()->after('payment_reference');
            });
        }

        if (Schema::hasTable('payslip_lines') && ! Schema::hasColumn('payslip_lines', 'meta')) {
            Schema::table('payslip_lines', function (Blueprint $table) {
                $table->json('meta')->nullable()->after('source');
            });
        }

        if (Schema::hasTable('payroll_periods')) {
            Schema::table('payroll_periods', function (Blueprint $table) {
                if (! Schema::hasColumn('payroll_periods', 'locked_at')) {
                    $table->timestamp('locked_at')->nullable()->after('status');
                }
                if (! Schema::hasColumn('payroll_periods', 'locked_by')) {
                    $table->foreignId('locked_by')->nullable()->after('locked_at')->constrained('users')->nullOnDelete();
                }
            });

            try {
                DB::statement("ALTER TABLE payroll_periods MODIFY status ENUM('open','processing','closed','locked') NOT NULL DEFAULT 'open'");
            } catch (\Throwable) {
                //
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payslip_lines') && Schema::hasColumn('payslip_lines', 'meta')) {
            Schema::table('payslip_lines', fn (Blueprint $table) => $table->dropColumn('meta'));
        }

        if (Schema::hasTable('payslips') && Schema::hasColumn('payslips', 'calculation_snapshot')) {
            Schema::table('payslips', fn (Blueprint $table) => $table->dropColumn('calculation_snapshot'));
        }

        if (Schema::hasTable('payrolls')) {
            Schema::table('payrolls', function (Blueprint $table) {
                foreach (['payment_journal_voucher_id', 'reversal_journal_voucher_id', 'payment_reversal_journal_voucher_id'] as $column) {
                    if (Schema::hasColumn('payrolls', $column)) {
                        $table->dropForeign([$column]);
                        $table->dropColumn($column);
                    }
                }
                if (Schema::hasColumn('payrolls', 'preview_snapshot')) {
                    $table->dropColumn('preview_snapshot');
                }
            });
        }

        if (Schema::hasTable('payroll_periods')) {
            Schema::table('payroll_periods', function (Blueprint $table) {
                if (Schema::hasColumn('payroll_periods', 'locked_by')) {
                    $table->dropForeign(['locked_by']);
                    $table->dropColumn('locked_by');
                }
                if (Schema::hasColumn('payroll_periods', 'locked_at')) {
                    $table->dropColumn('locked_at');
                }
            });
        }
    }
};
