<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_pending_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ai_conversation_id')->nullable();
            $table->uuid('user_id');
            $table->uuid('branch_id')->nullable();

            $table->string('action_type');           // e.g. create_invoice_draft, create_journal_voucher_draft
            $table->string('module')->nullable();    // invoices, journal_vouchers, etc.
            $table->string('target_type')->nullable();
            $table->string('target_id')->nullable();

            $table->string('title');
            $table->text('summary')->nullable();
            $table->json('payload');

            $table->string('risk_level')->default('low'); // low|medium|high|critical
            $table->json('risk_reasons')->nullable();

            $table->string('status')->default('pending'); // pending|approved|rejected|executed|failed|expired

            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->text('error_message')->nullable();

            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['ai_conversation_id']);
            $table->index(['module', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_pending_actions');
    }
};
