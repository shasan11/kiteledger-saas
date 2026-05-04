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

        Schema::create('leave_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignId('user_id')->constrained();
            $table->string('leave_type', 60);
            $table->dateTime('leave_from');
            $table->dateTime('leave_to');
            $table->dateTime('accept_leave_from')->nullable();
            $table->dateTime('accept_leave_to')->nullable();
            $table->foreignId('accept_leave_by')->nullable()->constrained('users');
            $table->integer('leave_duration')->nullable();
            $table->string('reason', 255)->nullable();
            $table->string('review_comment', 255)->nullable();
            $table->string('attachment', 255)->nullable();
            $table->enum('status', ["PENDING","APPROVED","REJECTED","CANCELLED"])->default('PENDING');
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
        Schema::dropIfExists('leave_applications');
    }
};
