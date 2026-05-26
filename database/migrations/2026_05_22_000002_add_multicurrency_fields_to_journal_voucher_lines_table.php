<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('journal_voucher_lines')) {
            return;
        }

        Schema::table('journal_voucher_lines', function (Blueprint $table) {
            if (! Schema::hasColumn('journal_voucher_lines', 'foreign_debit')) {
                $table->decimal('foreign_debit', 16, 2)->default(0)->after('credit');
            }

            if (! Schema::hasColumn('journal_voucher_lines', 'foreign_credit')) {
                $table->decimal('foreign_credit', 16, 2)->default(0)->after('foreign_debit');
            }

            if (! Schema::hasColumn('journal_voucher_lines', 'currency_id')) {
                $table->foreignUuid('currency_id')->nullable()->after('foreign_credit')->constrained()->nullOnDelete();
            }

            if (! Schema::hasColumn('journal_voucher_lines', 'exchange_rate')) {
                $table->decimal('exchange_rate', 18, 6)->default(1)->after('currency_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('journal_voucher_lines')) {
            return;
        }

        Schema::table('journal_voucher_lines', function (Blueprint $table) {
            if (Schema::hasColumn('journal_voucher_lines', 'currency_id')) {
                $table->dropConstrainedForeignId('currency_id');
            }

            foreach (['foreign_debit', 'foreign_credit', 'exchange_rate'] as $column) {
                if (Schema::hasColumn('journal_voucher_lines', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
