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

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('employee_id')->constrained();
            $table->foreignUuid('leave_type_id')->constrained();
            $table->date('from_date');
            $table->date('to_date');
            $table->decimal('requested_days', 6, 2)->default(0);
            $table->text('reason')->nullable();
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'cancelled'])->default('draft');
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
        Schema::dropIfExists('leave_requests');
    }
};
