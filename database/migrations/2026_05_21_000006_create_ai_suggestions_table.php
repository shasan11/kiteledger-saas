<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_suggestions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('module');
            $table->string('suggestion_type');
            $table->string('target_type')->nullable();
            $table->uuid('target_id')->nullable();
            $table->string('title');
            $table->text('summary')->nullable();
            $table->json('payload')->nullable();
            $table->string('status')->default('pending'); // pending | accepted | rejected | dismissed
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'module', 'status']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_suggestions');
    }
};
