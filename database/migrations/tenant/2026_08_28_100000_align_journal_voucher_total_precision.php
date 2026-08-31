<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * journal_vouchers.total was decimal(18,6) while journal_voucher_lines.debit and
 * .credit are decimal(16,2). The header could therefore hold a precision the
 * lines are incapable of representing, so a total could disagree with the sum of
 * its own lines by a sub-cent amount that no line could ever account for.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('journal_vouchers')) {
            return;
        }

        Schema::table('journal_vouchers', function (Blueprint $table): void {
            $table->decimal('total', 16, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('journal_vouchers')) {
            return;
        }

        Schema::table('journal_vouchers', function (Blueprint $table): void {
            $table->decimal('total', 18, 6)->default(0)->change();
        });
    }
};
