<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->string('source_type', 80)->nullable()->after('notes');
            $table->uuid('source_id')->nullable()->after('source_type');
            $table->boolean('is_system_generated')->default(false)->after('source_id');

            $table->index(['source_type', 'source_id'], 'ia_source_type_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropIndex('ia_source_type_id_index');
            $table->dropColumn(['source_type', 'source_id', 'is_system_generated']);
        });
    }
};
