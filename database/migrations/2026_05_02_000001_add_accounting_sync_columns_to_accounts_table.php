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
            if (! Schema::hasColumn('accounts', 'account_class')) {
                $table->string('account_class')->nullable();
            }

            if (! Schema::hasColumn('accounts', 'owner_type')) {
                $table->string('owner_type')->nullable();
            }

            if (! Schema::hasColumn('accounts', 'owner_id')) {
                $table->uuid('owner_id')->nullable();
            }

            if (! Schema::hasColumn('accounts', 'is_bank')) {
                $table->boolean('is_bank')->default(false);
            }

            if (! Schema::hasColumn('accounts', 'is_coa')) {
                $table->boolean('is_coa')->default(false);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (Schema::hasColumn('accounts', 'account_class')) {
                $table->dropColumn('account_class');
            }

            if (Schema::hasColumn('accounts', 'owner_type')) {
                $table->dropColumn('owner_type');
            }

            if (Schema::hasColumn('accounts', 'owner_id')) {
                $table->dropColumn('owner_id');
            }

            if (Schema::hasColumn('accounts', 'is_bank')) {
                $table->dropColumn('is_bank');
            }

            if (Schema::hasColumn('accounts', 'is_coa')) {
                $table->dropColumn('is_coa');
            }
        });
    }
};
