<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_vouchers', function (Blueprint $table) {
            $table->string('source_type', 100)->nullable()->after('narration');
            $table->uuid('source_id')->nullable()->after('source_type');
            $table->string('source_no', 40)->nullable()->after('source_id');
            $table->string('source_module', 100)->nullable()->after('source_no');
            $table->boolean('is_auto_generated')->default(false)->after('source_module');
            $table->uuid('reversed_journal_voucher_id')->nullable()->after('is_auto_generated');
            $table->text('reversal_reason')->nullable()->after('reversed_journal_voucher_id');
            $table->dateTime('reversed_at')->nullable()->after('reversal_reason');

            $table->index('source_type');
            $table->index('source_id');
            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::table('journal_vouchers', function (Blueprint $table) {
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropIndex('source_id');
            $table->dropIndex('source_type');
            $table->dropColumn([
                'source_type',
                'source_id',
                'source_no',
                'source_module',
                'is_auto_generated',
                'reversed_journal_voucher_id',
                'reversal_reason',
                'reversed_at',
            ]);
        });
    }
};
