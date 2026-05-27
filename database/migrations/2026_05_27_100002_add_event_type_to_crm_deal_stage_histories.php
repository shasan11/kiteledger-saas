<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_deal_stage_histories', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_deal_stage_histories', 'event_type')) {
                $table->string('event_type', 30)->nullable()->default('stage_change')->after('to_stage_id');
            }
            if (!Schema::hasColumn('crm_deal_stage_histories', 'to_status')) {
                $table->string('to_status', 30)->nullable()->after('event_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_deal_stage_histories', function (Blueprint $table) {
            if (Schema::hasColumn('crm_deal_stage_histories', 'to_status')) {
                $table->dropColumn('to_status');
            }
            if (Schema::hasColumn('crm_deal_stage_histories', 'event_type')) {
                $table->dropColumn('event_type');
            }
        });
    }
};
