<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('salary_month');
            $table->unsignedSmallInteger('salary_year');
            $table->unsignedSmallInteger('paid_leave')->default(0);
            $table->unsignedSmallInteger('unpaid_leave')->default(0);
            $table->unsignedSmallInteger('monthly_holiday')->default(0);
            $table->unsignedSmallInteger('public_holiday')->default(0);
            $table->unsignedSmallInteger('work_day')->default(0);
            $table->decimal('bonus', 14, 2)->nullable()->default(0);
            $table->string('bonus_comment', 255)->nullable();
            $table->decimal('deduction', 14, 2)->nullable()->default(0);
            $table->string('deduction_comment', 255)->nullable();
            $table->string('payment_status', 20)->default('UNPAID');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'salary_month', 'salary_year']);
            $table->index('branch_id');
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
