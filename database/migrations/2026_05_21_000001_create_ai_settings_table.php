<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->boolean('enabled')->default(false);
            $table->string('provider')->default('openai');
            $table->string('model')->nullable();
            $table->string('fallback_provider')->nullable();
            $table->string('fallback_model')->nullable();
            $table->text('api_key_encrypted')->nullable();
            $table->string('base_url')->nullable();
            $table->decimal('temperature', 3, 2)->default(0.20);
            $table->integer('max_tokens')->default(1200);
            $table->integer('daily_request_limit')->nullable();
            $table->integer('monthly_token_limit')->nullable();
            $table->json('enabled_modules')->nullable();
            $table->string('safety_mode')->default('strict');
            $table->boolean('log_prompts')->default(true);
            $table->boolean('log_responses')->default(true);
            $table->boolean('active')->default(true);
            $table->uuid('created_by_id')->nullable();
            $table->uuid('updated_by_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
