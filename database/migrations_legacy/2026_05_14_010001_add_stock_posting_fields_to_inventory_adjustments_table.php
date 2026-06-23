<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->boolean('stock_posted')->default(false)->after('approved_by_id');
            $table->timestamp('stock_posted_at')->nullable()->after('stock_posted');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropColumn(['stock_posted', 'stock_posted_at']);
        });
    }
};
