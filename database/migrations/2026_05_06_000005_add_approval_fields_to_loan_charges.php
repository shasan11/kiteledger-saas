<?php

use Illuminate\Database\Migrations\Migration;
return new class extends Migration
{
    public function up(): void
    {
        // Kept as a no-op because the same fields are applied by
        // 2026_05_06_000003_add_approval_fields_to_loan_charges_table.php.
    }

    public function down(): void
    {
        // No-op. The canonical migration owns the rollback.
    }
};
