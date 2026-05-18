<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('journal_vouchers') || Schema::hasColumn('journal_vouchers', 'is_system_generated')) {
            return;
        }

        Schema::table('journal_vouchers', function (Blueprint $table) {
            $table->boolean('is_system_generated')->default(false)->after('is_auto_generated');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('journal_vouchers') || !Schema::hasColumn('journal_vouchers', 'is_system_generated')) {
            return;
        }

        Schema::table('journal_vouchers', function (Blueprint $table) {
            $table->dropColumn('is_system_generated');
        });
    }
};
