<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_code_sequences', function (Blueprint $table) {
            if (!Schema::hasColumn('account_code_sequences', 'owner_type')) {
                $table->string('owner_type', 50)->default('coa')->after('id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('account_code_sequences', function (Blueprint $table) {
            if (Schema::hasColumn('account_code_sequences', 'owner_type')) {
                $table->dropColumn('owner_type');
            }
        });
    }
};