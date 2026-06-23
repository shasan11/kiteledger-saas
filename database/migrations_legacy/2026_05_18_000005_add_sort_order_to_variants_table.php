<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('variants') || Schema::hasColumn('variants', 'sort_order')) {
            return;
        }

        Schema::table('variants', function (Blueprint $table) {
            $table->unsignedSmallInteger('sort_order')->default(0)->after('name');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('variants') || !Schema::hasColumn('variants', 'sort_order')) {
            return;
        }

        Schema::table('variants', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
