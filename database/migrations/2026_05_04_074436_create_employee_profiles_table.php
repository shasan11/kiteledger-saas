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

        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->unique();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('employment_status_id')->nullable()->constrained();
            $table->foreignUuid('department_id')->nullable()->constrained();
            $table->foreignUuid('designation_id')->nullable()->constrained();
            $table->foreignUuid('shift_id')->nullable()->constrained();
            $table->foreignUuid('leave_policy_id')->nullable()->constrained();
            $table->foreignUuid('weekly_holiday_id')->nullable()->constrained();
            $table->string('employee_id', 60)->nullable();
            $table->dateTime('join_date')->nullable();
            $table->dateTime('leave_date')->nullable();
            $table->decimal('salary', 16, 2)->default(0);
            $table->string('blood_group', 10)->nullable();
            $table->string('emergency_contact_name', 120)->nullable();
            $table->string('emergency_contact_phone', 40)->nullable();
            $table->text('address')->nullable();
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
        Schema::dropIfExists('employee_profiles');
    }
};
