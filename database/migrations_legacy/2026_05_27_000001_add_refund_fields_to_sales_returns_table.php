<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sales_returns')) {
            return;
        }

        Schema::table('sales_returns', function (Blueprint $table) {
            if (! Schema::hasColumn('sales_returns', 'has_refund')) {
                $table->boolean('has_refund')->default(false)->after('total');
            }
            if (! Schema::hasColumn('sales_returns', 'refund_account_id')) {
                $table->foreignUuid('refund_account_id')
                    ->nullable()
                    ->after('has_refund')
                    ->constrained('accounts')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('sales_returns', 'refund_reference')) {
                $table->string('refund_reference', 120)->nullable()->after('refund_account_id');
            }
            if (! Schema::hasColumn('sales_returns', 'refund_amount')) {
                $table->decimal('refund_amount', 18, 6)->nullable()->after('refund_reference');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sales_returns')) {
            return;
        }

        Schema::table('sales_returns', function (Blueprint $table) {
            if (Schema::hasColumn('sales_returns', 'refund_account_id')) {
                $table->dropConstrainedForeignId('refund_account_id');
            }
            foreach (['has_refund', 'refund_reference', 'refund_amount'] as $col) {
                if (Schema::hasColumn('sales_returns', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
