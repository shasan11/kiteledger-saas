<?php

use App\Models\ChartOfAccount;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('journal_voucher_lines') || Schema::hasColumn('journal_voucher_lines', 'account_id')) {
            return;
        }

        Schema::table('journal_voucher_lines', function (Blueprint $table) {
            $table->foreignUuid('account_id')
                ->nullable()
                ->after('journal_voucher_id')
                ->constrained('accounts')
                ->nullOnDelete();
        });

        DB::table('journal_voucher_lines')
            ->orderBy('id')
            ->select(['id', 'chart_of_account_id'])
            ->chunk(200, function ($lines) {
                $accountIdsByCoa = ChartOfAccount::query()
                    ->whereIn('id', $lines->pluck('chart_of_account_id')->filter()->unique()->values())
                    ->pluck('account_id', 'id');

                foreach ($lines as $line) {
                    $accountId = $accountIdsByCoa[$line->chart_of_account_id] ?? null;

                    if ($accountId) {
                        DB::table('journal_voucher_lines')
                            ->where('id', $line->id)
                            ->update(['account_id' => $accountId]);
                    }
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('journal_voucher_lines') || ! Schema::hasColumn('journal_voucher_lines', 'account_id')) {
            return;
        }

        Schema::table('journal_voucher_lines', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropColumn('account_id');
        });
    }
};
