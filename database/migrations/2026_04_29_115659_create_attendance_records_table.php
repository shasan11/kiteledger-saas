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

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('employee_id')->constrained();
            $table->date('attendance_date');
            $table->dateTime('clock_in_at')->nullable();
            $table->dateTime('clock_out_at')->nullable();
            $table->decimal('work_hours', 6, 2)->default(0);
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'on_leave'])->default('present');
            $table->text('remarks')->nullable();
            $table->boolean('active')->default(true);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->unique(['employee_id', 'attendance_date']);
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
