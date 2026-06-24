<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit trail + tool-call ledger for the AI ERP assistant.
 *
 * - ai_action_audit_logs: immutable before/after record of every executed,
 *   rejected, or failed AI pending action (spec section 3E / 14).
 * - ai_tool_calls: deterministic tool invocations made while answering a chat
 *   message (spec section 3F).
 *
 * Mirrored in the consolidated fresh-install schema so new installs get them
 * too. Idempotent so it is safe to run on an already-installed instance.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_action_audit_logs')) {
            Schema::create('ai_action_audit_logs', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('ai_pending_action_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('action_type', 120);
                $table->string('module', 120)->nullable();
                $table->string('target_type', 120)->nullable();
                $table->string('target_id')->nullable();
                $table->json('before_values')->nullable();
                $table->json('after_values')->nullable();
                $table->string('status', 40)->default('executed');
                $table->string('ip_address', 60)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();
                $table->index(['action_type', 'status'], 'ai_audit_action_status_idx');
                $table->index(['user_id', 'created_at'], 'ai_audit_user_created_idx');
                $table->index(['ai_pending_action_id'], 'ai_audit_pending_action_idx');
            });
        }

        if (! Schema::hasTable('ai_tool_calls')) {
            Schema::create('ai_tool_calls', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('ai_conversation_id')->nullable();
                $table->uuid('ai_message_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('tool_name', 120);
                $table->json('input')->nullable();
                $table->json('output')->nullable();
                $table->string('status', 40)->default('completed');
                $table->text('error_message')->nullable();
                $table->integer('duration_ms')->nullable();
                $table->timestamps();
                $table->index(['tool_name', 'status'], 'ai_tool_calls_name_status_idx');
                $table->index(['user_id', 'created_at'], 'ai_tool_calls_user_created_idx');
                $table->index(['ai_conversation_id'], 'ai_tool_calls_conversation_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_tool_calls');
        Schema::dropIfExists('ai_action_audit_logs');
    }
};
