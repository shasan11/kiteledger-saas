<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'campaign_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->uuid('campaign_id')->nullable()->after('deal_pipeline_id')->index();
            });
        }

        if (Schema::hasTable('deals') && !Schema::hasColumn('deals', 'campaign_id')) {
            Schema::table('deals', function (Blueprint $table) {
                $table->uuid('campaign_id')->nullable()->after('crm_account_id')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'campaign_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('campaign_id');
            });
        }

        if (Schema::hasTable('deals') && Schema::hasColumn('deals', 'campaign_id')) {
            Schema::table('deals', function (Blueprint $table) {
                $table->dropColumn('campaign_id');
            });
        }
    }
};
