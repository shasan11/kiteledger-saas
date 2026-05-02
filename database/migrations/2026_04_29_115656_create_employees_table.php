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

        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignUuid('department_id')->nullable()->constrained();
            $table->foreignUuid('designation_id')->nullable()->constrained();
            $table->foreignUuid('shift_id')->nullable()->constrained();
            $table->string('employee_code', 40)->unique();
            $table->string('first_name', 80);
            $table->string('last_name', 80)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('phone', 30)->nullable();
            $table->date('date_of_joining')->nullable();
            $table->enum('employment_type', ['permanent', 'contract', 'intern', 'temporary'])->default('permanent');
            $table->decimal('basic_salary', 16, 2)->default(0);
            $table->decimal('allowance_amount', 16, 2)->default(0);
            $table->enum('status', ['draft', 'active', 'inactive', 'terminated'])->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('void')->default(false);
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
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
        Schema::dropIfExists('employees');
    }
};
