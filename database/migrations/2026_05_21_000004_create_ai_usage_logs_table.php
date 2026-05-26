<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('module')->nullable();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->integer('prompt_tokens')->default(0);
            $table->integer('completion_tokens')->default(0);
            $table->integer('total_tokens')->default(0);
            $table->decimal('estimated_cost', 10, 6)->nullable();
            $table->string('status')->default('success'); // success | error | blocked
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->string('request_hash')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'module', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
