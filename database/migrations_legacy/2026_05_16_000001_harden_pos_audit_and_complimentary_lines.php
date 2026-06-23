<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sale_lines', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_sale_lines', 'is_complimentary')) {
                $table->boolean('is_complimentary')->default(false)->after('returned_qty');
            }

            if (!Schema::hasColumn('pos_sale_lines', 'complimentary_reason')) {
                $table->string('complimentary_reason', 180)->nullable()->after('is_complimentary');
            }
        });

        Schema::table('pos_cash_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_cash_movements', 'source_type')) {
                $table->string('source_type', 80)->nullable()->after('is_system_generated');
            }

            if (!Schema::hasColumn('pos_cash_movements', 'source_id')) {
                $table->uuid('source_id')->nullable()->after('source_type');
            }

            if (!Schema::hasColumn('pos_cash_movements', 'source_reference')) {
                $table->string('source_reference', 120)->nullable()->after('source_id');
            }

            $table->index(['source_type', 'source_id'], 'pos_cash_movements_source_index');
        });
    }

    public function down(): void
    {
        Schema::table('pos_cash_movements', function (Blueprint $table) {
            if (Schema::hasColumn('pos_cash_movements', 'source_type')) {
                $table->dropIndex('pos_cash_movements_source_index');
                $table->dropColumn(['source_type', 'source_id', 'source_reference']);
            }
        });

        Schema::table('pos_sale_lines', function (Blueprint $table) {
            if (Schema::hasColumn('pos_sale_lines', 'is_complimentary')) {
                $table->dropColumn(['is_complimentary', 'complimentary_reason']);
            }
        });
    }
};
