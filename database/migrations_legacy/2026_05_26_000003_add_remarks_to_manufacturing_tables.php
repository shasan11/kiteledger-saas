<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 of transaction standardization.
 *
 * Adds `remarks` text column to manufacturing tables alongside the existing
 * `notes`. Idempotent. Does not touch the inventory ledger or any posting
 * service — those stay strictly inside Manufacturing/Inventory posting code.
 */
return new class extends Migration {
    private array $tables = [
        'bills_of_material',
        'production_orders',
        'production_journals',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table) || Schema::hasColumn($table, 'remarks')) {
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
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'remarks')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('remarks');
            });
        }
    }
};
