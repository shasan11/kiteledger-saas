<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_transfers', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouse_transfers', 'stock_posted')) {
                $table->boolean('stock_posted')->default(false)->after('approved_by_id');
            }

            if (!Schema::hasColumn('warehouse_transfers', 'stock_posted_at')) {
                $table->timestamp('stock_posted_at')->nullable()->after('stock_posted');
            }
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_transfers', function (Blueprint $table) {
            if (Schema::hasColumn('warehouse_transfers', 'stock_posted_at')) {
                $table->dropColumn('stock_posted_at');
            }

            if (Schema::hasColumn('warehouse_transfers', 'stock_posted')) {
                $table->dropColumn('stock_posted');
            }
        });
    }
};
