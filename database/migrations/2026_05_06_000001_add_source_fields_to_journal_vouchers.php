<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Intentionally left blank.
        //
        // The real source/reversal fields migration is:
        // 2026_05_06_000001_add_source_fields_to_journal_vouchers_table.php
        //
        // This duplicate file used to add the same columns first, causing
        // migrate:fresh to fail with "duplicate column name: source_type".
    }

    public function down(): void
    {
        // Intentionally left blank. See up().
    }
};
