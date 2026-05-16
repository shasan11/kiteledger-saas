<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_configurations', function (Blueprint $table) {
            $table->enum('suggest_selling', ['recent', 'last_sale', 'standard_price', 'average_cost_markup'])->default('recent')->after('allow_negative_receivable');
            $table->enum('negative_item_balance', ['allow', 'warn', 'block'])->default('warn')->after('suggest_selling');
            $table->enum('credit_limit_exceed', ['allow', 'warn', 'block'])->default('warn')->after('negative_item_balance');
            $table->enum('negative_cash_balance', ['allow', 'warn', 'block'])->default('warn')->after('credit_limit_exceed');
        });

        Schema::table('purchase_configurations', function (Blueprint $table) {
            $table->enum('negative_item_balance', ['allow', 'warn', 'block'])->default('warn')->after('require_bill_approval');
            $table->enum('negative_cash_balance', ['allow', 'warn', 'block'])->default('warn')->after('negative_item_balance');
        });
    }

    public function down(): void
    {
        Schema::table('sales_configurations', function (Blueprint $table) {
            $table->dropColumn(['suggest_selling', 'negative_item_balance', 'credit_limit_exceed', 'negative_cash_balance']);
        });

        Schema::table('purchase_configurations', function (Blueprint $table) {
            $table->dropColumn(['negative_item_balance', 'negative_cash_balance']);
        });
    }
};
