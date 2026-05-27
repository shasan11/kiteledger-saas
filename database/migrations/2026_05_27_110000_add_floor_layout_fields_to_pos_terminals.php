<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_terminals', function (Blueprint $table) {
            if (!Schema::hasColumn('pos_terminals', 'floor_name')) {
                $table->string('floor_name', 120)->nullable()->after('location');
            }

            if (!Schema::hasColumn('pos_terminals', 'x_position')) {
                $table->unsignedInteger('x_position')->default(24)->after('floor_name');
            }

            if (!Schema::hasColumn('pos_terminals', 'y_position')) {
                $table->unsignedInteger('y_position')->default(24)->after('x_position');
            }

            if (!Schema::hasColumn('pos_terminals', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('y_position');
            }

            if (!Schema::hasColumn('pos_terminals', 'status')) {
                $table->string('status', 40)->default('available')->after('sort_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pos_terminals', function (Blueprint $table) {
            foreach (['status', 'sort_order', 'y_position', 'x_position', 'floor_name'] as $column) {
                if (Schema::hasColumn('pos_terminals', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
