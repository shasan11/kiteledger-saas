<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::table('users', function (Blueprint $table) {
            // Personal info
            $table->string('first_name', 80)->nullable()->after('name');
            $table->string('last_name', 80)->nullable()->after('first_name');
            $table->string('username', 80)->nullable()->unique()->after('last_name');
            $table->string('phone', 40)->nullable()->after('email');
            $table->string('blood_group', 10)->nullable()->after('phone');
            $table->string('image', 255)->nullable()->after('blood_group');

            // Address
            $table->string('street', 180)->nullable()->after('image');
            $table->string('city', 80)->nullable()->after('street');
            $table->string('state', 80)->nullable()->after('city');
            $table->string('zip_code', 30)->nullable()->after('state');
            $table->string('country', 80)->nullable()->after('zip_code');

            // Employment info
            $table->string('employee_id', 60)->nullable()->after('country');
            $table->date('join_date')->nullable()->after('employee_id');
            $table->date('leave_date')->nullable()->after('join_date');

            // FK relations (nullable, added after employment tables exist)
            $table->foreignUuid('employment_status_id')->nullable()->after('leave_date')
                  ->constrained('employment_statuses')->nullOnDelete();
            $table->foreignUuid('department_id')->nullable()->after('employment_status_id')
                  ->constrained('departments')->nullOnDelete();
            $table->foreignUuid('role_id')->nullable()->after('department_id')
                  ->constrained('roles')->nullOnDelete();
            $table->foreignUuid('shift_id')->nullable()->after('role_id')
                  ->constrained('shifts')->nullOnDelete();
            $table->foreignUuid('leave_policy_id')->nullable()->after('shift_id')
                  ->constrained('leave_policies')->nullOnDelete();
            $table->foreignUuid('weekly_holiday_id')->nullable()->after('leave_policy_id')
                  ->constrained('weekly_holidays')->nullOnDelete();

            // System fields
            $table->boolean('active')->default(true)->after('weekly_holiday_id');
            $table->boolean('is_system_generated')->default(false)->after('active');
            $table->foreignId('user_add_id')->nullable()->after('is_system_generated')
                  ->constrained('users')->nullOnDelete();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('weekly_holiday_id');
            $table->dropConstrainedForeignId('leave_policy_id');
            $table->dropConstrainedForeignId('shift_id');
            $table->dropConstrainedForeignId('role_id');
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('employment_status_id');
            $table->dropConstrainedForeignId('user_add_id');
            $table->dropColumn([
                'first_name', 'last_name', 'username', 'phone', 'blood_group', 'image',
                'street', 'city', 'state', 'zip_code', 'country',
                'employee_id', 'join_date', 'leave_date',
                'active', 'is_system_generated',
            ]);
        });
    }
};
