<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cheque_registers') || Schema::hasColumn('cheque_registers', 'journal_voucher_id')) {
            return;
        }

        Schema::table('cheque_registers', function (Blueprint $table) {
            $table->uuid('journal_voucher_id')->nullable()->after('total');
            $table->foreign('journal_voucher_id')->references('id')->on('journal_vouchers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('cheque_registers') || !Schema::hasColumn('cheque_registers', 'journal_voucher_id')) {
            return;
        }

        Schema::table('cheque_registers', function (Blueprint $table) {
            $table->dropForeign(['journal_voucher_id']);
            $table->dropColumn('journal_voucher_id');
        });
    }
};
