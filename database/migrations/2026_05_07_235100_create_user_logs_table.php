<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('user_logs')) {
            Schema::create('user_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users');
                $table->foreignUuid('branch_id')->nullable()->constrained('branches');
                $table->string('event', 120)->nullable();
                $table->string('status', 60)->nullable();
                $table->string('ip_address', 60)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_logs');
    }
};
