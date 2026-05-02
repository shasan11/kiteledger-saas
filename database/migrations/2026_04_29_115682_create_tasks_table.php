<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('milestone_id')->constrained('milestones')->restrictOnDelete();
            $table->foreignUuid('priority_id')->constrained('priorities')->restrictOnDelete();
            $table->foreignUuid('task_status_id')->constrained('task_statuses')->restrictOnDelete();
            $table->string('name', 180);
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('completion_time', 8, 2)->default(0);
            $table->text('description');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'task_status_id']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
