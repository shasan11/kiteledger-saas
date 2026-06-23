<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'deal_pipeline_id')) {
                $table->uuid('deal_pipeline_id')->nullable()->after('crm_account_id');
                $table->index('deal_pipeline_id');
            }
            if (!Schema::hasColumn('leads', 'next_follow_up_at')) {
                $table->dateTime('next_follow_up_at')->nullable()->after('next_follow_up_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['deal_pipeline_id', 'next_follow_up_at']);
        });
    }
};
