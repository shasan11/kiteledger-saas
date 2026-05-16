<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (Schema::hasTable('app_settings')) {
            DB::statement("ALTER TABLE app_settings MODIFY suggest_selling ENUM('recent','last_sale','standard_price','average_cost_markup') DEFAULT 'recent'");
            DB::statement("ALTER TABLE app_settings MODIFY negative_cash_balance ENUM('allow','warn','block') DEFAULT 'warn'");
            DB::statement("ALTER TABLE app_settings MODIFY negative_item_balance ENUM('allow','warn','block') DEFAULT 'warn'");
            DB::statement("ALTER TABLE app_settings MODIFY credit_limit_exceed ENUM('allow','warn','block') DEFAULT 'warn'");
        }

        if (Schema::hasTable('sales_configurations')) {
            DB::statement("ALTER TABLE sales_configurations MODIFY suggest_selling ENUM('recent','last_sale','standard_price','average_cost_markup') DEFAULT 'recent'");
            DB::statement("ALTER TABLE sales_configurations MODIFY negative_cash_balance ENUM('allow','warn','block') DEFAULT 'warn'");
            DB::statement("ALTER TABLE sales_configurations MODIFY negative_item_balance ENUM('allow','warn','block') DEFAULT 'warn'");
            DB::statement("ALTER TABLE sales_configurations MODIFY credit_limit_exceed ENUM('allow','warn','block') DEFAULT 'warn'");
        }

        if (Schema::hasTable('purchase_configurations')) {
            DB::statement("ALTER TABLE purchase_configurations MODIFY negative_cash_balance ENUM('allow','warn','block') DEFAULT 'warn'");
            DB::statement("ALTER TABLE purchase_configurations MODIFY negative_item_balance ENUM('allow','warn','block') DEFAULT 'warn'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (Schema::hasTable('app_settings')) {
            DB::statement("ALTER TABLE app_settings MODIFY suggest_selling ENUM('recent','fixed') DEFAULT 'recent'");
            DB::statement("ALTER TABLE app_settings MODIFY negative_cash_balance ENUM('reject','warn','do_nothing') DEFAULT 'warn'");
            DB::statement("ALTER TABLE app_settings MODIFY negative_item_balance ENUM('reject','warn','do_nothing') DEFAULT 'warn'");
            DB::statement("ALTER TABLE app_settings MODIFY credit_limit_exceed ENUM('reject','warn','do_nothing') DEFAULT 'warn'");
        }
    }
};
