<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->unique(['branch_id', 'code'], 'accounts_branch_id_code_unique');
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->unique(['branch_id', 'code'], 'chart_of_accounts_branch_id_code_unique');
        });

        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->unique(['branch_id', 'code'], 'bank_accounts_branch_id_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropUnique('accounts_branch_id_code_unique');
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropUnique('chart_of_accounts_branch_id_code_unique');
        });

        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropUnique('bank_accounts_branch_id_code_unique');
        });
    }
};
