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

        Schema::create('payslips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignId('user_id')->constrained();
            $table->integer('salary_month');
            $table->integer('salary_year');
            $table->decimal('salary', 16, 2);
            $table->integer('paid_leave')->default(0);
            $table->integer('unpaid_leave')->default(0);
            $table->integer('monthly_holiday')->default(0);
            $table->integer('public_holiday')->default(0);
            $table->integer('work_day')->default(0);
            $table->decimal('shift_wise_work_hour', 8, 2)->default(0);
            $table->decimal('monthly_work_hour', 8, 2)->default(0);
            $table->decimal('hourly_salary', 16, 2)->default(0);
            $table->decimal('working_hour', 8, 2)->default(0);
            $table->decimal('salary_payable', 16, 2)->default(0);
            $table->decimal('bonus', 16, 2)->default(0);
            $table->string('bonus_comment', 255)->nullable();
            $table->decimal('deduction', 16, 2)->default(0);
            $table->string('deduction_comment', 255)->nullable();
            $table->decimal('total_payable', 16, 2)->default(0);
            $table->enum('payment_status', ["UNPAID","PAID","PARTIAL"])->default('UNPAID');
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
        Schema::dropIfExists('payslips');
    }
};
