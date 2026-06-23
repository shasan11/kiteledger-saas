<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('branch_id')->nullable();
            $table->string('ticket_no', 20)->unique();
            $table->string('subject', 255);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('open');
            $table->string('priority', 20)->default('medium');
            $table->string('category', 60)->nullable();
            $table->string('source', 30)->nullable()->default('manual');
            $table->uuid('contact_id')->nullable();
            $table->uuid('lead_id')->nullable();
            $table->uuid('deal_id')->nullable();
            $table->uuid('campaign_id')->nullable();
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->unsignedBigInteger('resolved_by_id')->nullable();
            $table->unsignedBigInteger('closed_by_id')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->json('tags')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('branch_id');
            $table->index('status');
            $table->index('priority');
            $table->index('contact_id');
            $table->index('lead_id');
            $table->index('deal_id');
            $table->index('campaign_id');
            $table->index('assigned_to_id');
            $table->index('created_by_id');
            $table->index(['status', 'priority']);
            $table->index(['branch_id', 'status']);
            $table->index('due_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
