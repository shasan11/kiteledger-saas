<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_usage_logs')) {
            return;
        }

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_usage_logs', 'question')) {
                $table->text('question')->nullable()->after('request_hash');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'intent')) {
                $table->string('intent', 80)->nullable()->after('question');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'selected_tool')) {
                $table->string('selected_tool', 120)->nullable()->after('intent');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'filters')) {
                $table->json('filters')->nullable()->after('selected_tool');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'date_range')) {
                $table->json('date_range')->nullable()->after('filters');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'row_count')) {
                $table->unsignedInteger('row_count')->nullable()->after('date_range');
            }
            if (! Schema::hasColumn('ai_usage_logs', 'token_estimate')) {
                $table->unsignedInteger('token_estimate')->nullable()->after('row_count');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_usage_logs')) {
            return;
        }

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            foreach (['token_estimate', 'row_count', 'date_range', 'filters', 'selected_tool', 'intent', 'question'] as $column) {
                if (Schema::hasColumn('ai_usage_logs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
