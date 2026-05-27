<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_statement_lines', function (Blueprint $table) {
            $table->uuid('matched_journal_voucher_line_id')->nullable()->after('posted_journal_voucher_id');
            $table->uuid('bank_reconciliation_id')->nullable()->after('matched_journal_voucher_line_id');
            $table->string('match_confidence', 16)->nullable()->after('bank_reconciliation_id');
            $table->string('match_type', 16)->nullable()->after('match_confidence');
            $table->timestamp('matched_at')->nullable()->after('match_type');
            $table->unsignedBigInteger('matched_by_id')->nullable()->after('matched_at');
            $table->string('transaction_hash', 64)->nullable()->after('matched_by_id');

            $table->index(['bank_account_id', 'transaction_hash']);
            $table->index('matched_journal_voucher_line_id');
            $table->index('bank_reconciliation_id');
        });
    }

    public function down(): void
    {
        Schema::table('bank_statement_lines', function (Blueprint $table) {
            $table->dropIndex(['bank_account_id', 'transaction_hash']);
            $table->dropIndex(['matched_journal_voucher_line_id']);
            $table->dropIndex(['bank_reconciliation_id']);
            $table->dropColumn([
                'matched_journal_voucher_line_id',
                'bank_reconciliation_id',
                'match_confidence',
                'match_type',
                'matched_at',
                'matched_by_id',
                'transaction_hash',
            ]);
        });
    }
};
