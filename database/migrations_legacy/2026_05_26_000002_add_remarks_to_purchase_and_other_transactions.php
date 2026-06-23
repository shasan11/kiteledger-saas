<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2b + 2c of transaction standardization.
 *
 * Adds the `remarks` companion text column to the 9 remaining transaction
 * tables. The existing text field per table (notes / narration / description)
 * remains and is mapped to the "Description" panel on the form; this column
 * powers the "Remarks" panel. Idempotent and safe to re-run.
 */
return new class extends Migration {
    private array $tables = [
        'purchase_orders',
        'purchase_bills',
        'expenses',
        'debit_notes',
        'supplier_payments',
        'journal_vouchers',
        'loan_accounts',
        'warehouse_transfers',
        'inventory_adjustments',
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
                // Place after the most likely existing text field for each table.
                $after = null;
                foreach (['notes', 'narration', 'description', 'reason'] as $candidate) {
                    if (Schema::hasColumn($table, $candidate)) {
                        $after = $candidate;
                        break;
                    }
                }
                if ($after) {
                    $t->text('remarks')->nullable()->after($after);
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
