<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('leave_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('leave_type', 60);
            $table->date('leave_from');
            $table->date('leave_to');
            $table->date('accept_leave_from')->nullable();
            $table->date('accept_leave_to')->nullable();
            $table->foreignId('accept_leave_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('leave_duration')->nullable();
            $table->string('reason', 255)->nullable();
            $table->string('review_comment', 255)->nullable();
            $table->string('attachment', 255)->nullable();
            $table->string('status', 20)->default('PENDING');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('branch_id');
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_applications');
    }
};
