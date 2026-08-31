<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_pending_actions')) {
            return;
        }

        Schema::table('ai_pending_actions', function (Blueprint $table): void {
            if (! Schema::hasColumn('ai_pending_actions', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->unique();
            }
            if (! Schema::hasColumn('ai_pending_actions', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->index();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_pending_actions')) {
            return;
        }

        Schema::table('ai_pending_actions', function (Blueprint $table): void {
            if (Schema::hasColumn('ai_pending_actions', 'idempotency_key')) {
                $table->dropUnique(['idempotency_key']);
                $table->dropColumn('idempotency_key');
            }
            if (Schema::hasColumn('ai_pending_actions', 'expires_at')) {
                $table->dropColumn('expires_at');
            }
        });
    }
};
