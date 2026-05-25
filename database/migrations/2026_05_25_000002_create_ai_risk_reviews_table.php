<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_risk_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('module');
            $table->string('target_type')->nullable();
            $table->string('target_id')->nullable();

            $table->string('risk_level')->default('low');
            $table->unsignedInteger('score')->default(0);
            $table->json('reasons')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('checked_payload')->nullable();
            $table->timestamps();

            $table->index(['module', 'risk_level']);
            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_risk_reviews');
    }
};
