<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contacts') || Schema::hasColumn('contacts', 'payable_account_id')) {
            return;
        }

        Schema::table('contacts', function (Blueprint $table) {
            $table->foreignUuid('payable_account_id')
                ->nullable()
                ->after('account_id')
                ->constrained('accounts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('contacts') || ! Schema::hasColumn('contacts', 'payable_account_id')) {
            return;
        }

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payable_account_id');
        });
    }
};
