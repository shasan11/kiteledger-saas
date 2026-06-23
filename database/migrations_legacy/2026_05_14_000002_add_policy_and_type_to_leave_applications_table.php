<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_applications', 'leave_policy_id')) {
                $table->uuid('leave_policy_id')
                    ->nullable()
                    ->after('user_id');
            }

            if (!Schema::hasColumn('leave_applications', 'leave_type_id')) {
                $table->uuid('leave_type_id')
                    ->nullable()
                    ->after('leave_policy_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leave_applications', function (Blueprint $table) {
            if (Schema::hasColumn('leave_applications', 'leave_type_id')) {
                $table->dropColumn('leave_type_id');
            }

            if (Schema::hasColumn('leave_applications', 'leave_policy_id')) {
                $table->dropColumn('leave_policy_id');
            }
        });
    }
};
