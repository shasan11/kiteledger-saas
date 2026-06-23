<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reporting_tags', function (Blueprint $table) {
            if (!Schema::hasColumn('reporting_tags', 'code')) {
                $table->string('code', 80)->nullable()->after('name');
            }
            if (!Schema::hasColumn('reporting_tags', 'type')) {
                $table->string('type', 40)->default('text')->after('code');
            }
            if (!Schema::hasColumn('reporting_tags', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('color');
            }
        });

        Schema::table('reporting_tag_lines', function (Blueprint $table) {
            if (!Schema::hasColumn('reporting_tag_lines', 'value')) {
                $table->string('value', 120)->nullable()->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reporting_tag_lines', function (Blueprint $table) {
            if (Schema::hasColumn('reporting_tag_lines', 'value')) {
                $table->dropColumn('value');
            }
        });

        Schema::table('reporting_tags', function (Blueprint $table) {
            foreach (['code', 'type', 'sort_order'] as $column) {
                if (Schema::hasColumn('reporting_tags', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
