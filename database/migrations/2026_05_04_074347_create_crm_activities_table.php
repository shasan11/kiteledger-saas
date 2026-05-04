<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('crm_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lead_id')->nullable()->constrained();
            $table->foreignUuid('deal_id')->nullable()->constrained();
            $table->foreignUuid('contact_id')->nullable()->constrained();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users');
            $table->enum('activity_type', ["call","email","meeting","task","note","whatsapp","sms","follow_up"])->default('task');
            $table->string('subject', 180);
            $table->text('description')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->enum('status', ["pending","in_progress","completed","cancelled"])->default('pending');
            $table->enum('priority', ["low","medium","high","urgent"])->default('medium');
            $table->string('outcome', 255)->nullable();
            $table->dateTime('next_follow_up_at')->nullable();
            $table->dateTime('reminder_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crm_activities');
    }
};
