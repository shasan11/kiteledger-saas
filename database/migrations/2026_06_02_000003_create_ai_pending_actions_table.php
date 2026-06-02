<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_pending_actions')) {
            return;
        }

        Schema::create('ai_pending_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ai_conversation_id')->nullable()->constrained('ai_conversations')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('action_type', 120);
            $table->string('module', 120)->nullable();
            $table->string('target_type', 120)->nullable();
            $table->string('target_id')->nullable();
            $table->string('title')->nullable();
            $table->text('summary')->nullable();
            $table->json('payload')->nullable();
            $table->string('risk_level', 40)->default('medium');
            $table->json('risk_reasons')->nullable();
            $table->string('status', 40)->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
            $table->index(['module', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_pending_actions');
    }
};
