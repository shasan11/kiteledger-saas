<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_top_ups', function (Blueprint $table) {
            $table->string('topup_no', 40)->nullable()->unique()->after('loan_account_id');
            $table->boolean('approved')->default(false)->after('notes');
            $table->dateTime('approved_at')->nullable()->after('approved');
            $table->foreignId('approved_by_id')->nullable()->constrained('users')->after('approved_at');
            $table->boolean('void')->default(false)->after('approved_by_id');
            $table->foreignId('voided_by_id')->nullable()->constrained('users')->after('void');
            $table->text('voided_reason')->nullable()->after('voided_by_id');
            $table->dateTime('voided_at')->nullable()->after('voided_reason');
            $table->uuid('journal_voucher_id')->nullable()->after('voided_at');
            $table->foreign('journal_voucher_id')->references('id')->on('journal_vouchers')->nullOnDelete();
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft')->after('journal_voucher_id');
        });
    }

    public function down(): void
    {
        Schema::table('loan_top_ups', function (Blueprint $table) {
            $table->dropUnique(['topup_no']);
            $table->dropForeign(['approved_by_id']);
            $table->dropForeign(['voided_by_id']);
            $table->dropForeign(['journal_voucher_id']);
            $table->dropColumn([
                'topup_no',
                'approved',
                'approved_at',
                'approved_by_id',
                'void',
                'voided_by_id',
                'voided_reason',
                'voided_at',
                'journal_voucher_id',
                'status',
            ]);
        });
    }
};
