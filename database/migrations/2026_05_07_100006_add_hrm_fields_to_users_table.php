<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name')->nullable()->after('name');
            }
            if (! Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('last_name');
            }
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (! Schema::hasColumn('users', 'blood_group')) {
                $table->string('blood_group', 10)->nullable();
            }
            if (! Schema::hasColumn('users', 'image')) {
                $table->string('image')->nullable();
            }
            if (! Schema::hasColumn('users', 'street')) {
                $table->string('street')->nullable();
            }
            if (! Schema::hasColumn('users', 'city')) {
                $table->string('city')->nullable();
            }
            if (! Schema::hasColumn('users', 'state')) {
                $table->string('state')->nullable();
            }
            if (! Schema::hasColumn('users', 'zip_code')) {
                $table->string('zip_code', 20)->nullable();
            }
            if (! Schema::hasColumn('users', 'country')) {
                $table->string('country')->nullable();
            }
            if (! Schema::hasColumn('users', 'employee_id')) {
                $table->string('employee_id')->nullable()->unique();
            }
            if (! Schema::hasColumn('users', 'join_date')) {
                $table->date('join_date')->nullable();
            }
            if (! Schema::hasColumn('users', 'leave_date')) {
                $table->date('leave_date')->nullable();
            }
            if (! Schema::hasColumn('users', 'employment_status_id')) {
                $table->foreignUuid('employment_status_id')->nullable()->constrained('employment_statuses')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'department_id')) {
                $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'role_id')) {
                $table->uuid('role_id')->nullable();
            }
            if (! Schema::hasColumn('users', 'shift_id')) {
                $table->foreignUuid('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'leave_policy_id')) {
                $table->foreignUuid('leave_policy_id')->nullable()->constrained('leave_policies')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'weekly_holiday_id')) {
                $table->foreignUuid('weekly_holiday_id')->nullable()->constrained('weekly_holidays')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'active')) {
                $table->boolean('active')->default(true);
            }
            if (! Schema::hasColumn('users', 'is_system_generated')) {
                $table->boolean('is_system_generated')->default(false);
            }
            if (! Schema::hasColumn('users', 'user_add_id')) {
                $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = ['first_name', 'last_name', 'username', 'phone', 'blood_group', 'image', 'street', 'city', 'state',
                'zip_code', 'country', 'employee_id', 'join_date', 'leave_date', 'employment_status_id',
                'department_id', 'role_id', 'shift_id', 'leave_policy_id', 'weekly_holiday_id',
                'active', 'is_system_generated', 'user_add_id'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
