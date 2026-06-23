<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_bills', function (Blueprint $table) {
            $table->uuid('lead_id')->nullable()->after('contact_id');
            $table->uuid('deal_id')->nullable()->after('lead_id');
            $table->uuid('campaign_id')->nullable()->after('deal_id');

            $table->index('lead_id');
            $table->index('deal_id');
            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_bills', function (Blueprint $table) {
            $table->dropIndex(['lead_id']);
            $table->dropIndex(['deal_id']);
            $table->dropIndex(['campaign_id']);
            $table->dropColumn(['lead_id', 'deal_id', 'campaign_id']);
        });
    }
};
