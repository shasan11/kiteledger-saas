<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2a of transaction standardization.
 *
 * The transaction-standardization spec requires every transaction module to
 * expose two collapsed text areas on the form: Description and Remarks. The
 * existing sales-side tables already have a `notes` text column (treated as
 * "Description" going forward); this migration adds the `remarks` companion
 * column so the second collapse panel has somewhere to persist.
 *
 * Five tables touched: invoices, quotations, sales_orders, customer_payments,
 * sales_returns. Each gets a nullable text column placed after `notes` where
 * the column exists. Down() drops the column if the table still exists.
 */
return new class extends Migration {
    private array $tables = [
        'invoices',
        'quotations',
        'sales_orders',
        'customer_payments',
        'sales_returns',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            if (Schema::hasColumn($table, 'remarks')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) use ($table) {
                if (Schema::hasColumn($table, 'notes')) {
                    $t->text('remarks')->nullable()->after('notes');
                } else {
                    $t->text('remarks')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            if (!Schema::hasColumn($table, 'remarks')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('remarks');
            });
        }
    }
};
