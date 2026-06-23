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

        Schema::create('deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('deal_no', 40)->unique()->nullable();
            $table->foreignUuid('lead_id')->nullable()->constrained();
            $table->foreignUuid('contact_id')->nullable()->constrained();
            $table->foreignUuid('deal_pipeline_id')->nullable()->constrained();
            $table->foreignUuid('deal_stage_id')->nullable()->constrained();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users');
            $table->string('title', 180);
            $table->decimal('amount', 16, 2)->default(0);
            $table->date('expected_close_date')->nullable();
            $table->date('closed_date')->nullable();
            $table->unsignedTinyInteger('probability')->default(0);
            $table->string('source', 80)->nullable();
            $table->enum('priority', ["low","medium","high","urgent"])->default('medium');
            $table->enum('status', ["open","won","lost","cancelled"])->default('open');
            $table->string('lost_reason', 255)->nullable();
            $table->text('description')->nullable();
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
        Schema::dropIfExists('deals');
    }
};
