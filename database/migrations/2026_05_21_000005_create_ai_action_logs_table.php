<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_action_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('branch_id')->nullable();
            $table->string('module')->nullable();
            $table->string('action_type');
            $table->string('target_type')->nullable();
            $table->uuid('target_id')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->string('risk_level')->nullable();
            $table->string('status')->default('suggested');
            $table->timestamps();

            $table->index(['user_id', 'module']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_action_logs');
    }
};
