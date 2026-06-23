<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TYPES = [
        'custom_status',
        'lead_source',
        'deal_stage',
        'task_type',
        'credit_term',
        'cost_term',
        'payment_mode',
        'tds_type',
        'industry',
        'activity_type',
        'lost_reason',
        'campaign_source',
        'campaign_medium',
    ];

    private const PREVIOUS_TYPES = [
        'custom_status',
        'lead_source',
        'deal_stage',
        'task_type',
        'credit_term',
        'cost_term',
        'payment_mode',
        'tds_type',
        'industry',
        'activity_type',
        'lost_reason',
    ];

    public function up(): void
    {
        Schema::table('master_data', function (Blueprint $table) {
            $table->enum('type', self::TYPES)->change();
        });
    }

    public function down(): void
    {
        Schema::table('master_data', function (Blueprint $table) {
            $table->enum('type', self::PREVIOUS_TYPES)->change();
        });
    }
};
