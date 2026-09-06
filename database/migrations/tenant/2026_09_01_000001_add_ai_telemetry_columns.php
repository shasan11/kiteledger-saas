<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Structured AI telemetry.
 *
 * The existing log recorded tokens and duration, which answers "what did this
 * cost" but not "why was it slow", "which provider actually answered" or "did
 * the user wait for a model at all". Those are the questions asked when a
 * customer reports the Copilot being slow or giving a different answer than
 * yesterday, and none of them could be answered from the data.
 *
 * Deliberately no prompt or answer text: this table is queried for operational
 * patterns, and storing the accounting content of every question would turn an
 * ops table into a second copy of the ledger.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_usage_logs')) {
            return;
        }

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            // Correlates a log row with the trace shown to a debug user and
            // with anything written to the application log for the same turn.
            if (! Schema::hasColumn('ai_usage_logs', 'request_id')) {
                $table->string('request_id', 64)->nullable()->after('id');
            }

            // Which AI surface produced this: copilot, report_summary,
            // document_extraction, knowledge_index.
            if (! Schema::hasColumn('ai_usage_logs', 'feature')) {
                $table->string('feature', 40)->nullable()->after('module');
            }

            if (! Schema::hasColumn('ai_usage_logs', 'error_code')) {
                $table->string('error_code', 60)->nullable()->after('error_message');
            }

            // Set only when the primary provider failed and the spare answered.
            if (! Schema::hasColumn('ai_usage_logs', 'fallback_provider')) {
                $table->string('fallback_provider', 40)->nullable()->after('provider');
            }

            if (! Schema::hasColumn('ai_usage_logs', 'cache_hit')) {
                $table->boolean('cache_hit')->default(false)->after('status');
            }

            // Time to the first visible token. The number a user actually
            // experiences as "is this thing working", which total duration hides.
            if (! Schema::hasColumn('ai_usage_logs', 'first_token_ms')) {
                $table->unsignedInteger('first_token_ms')->nullable()->after('duration_ms');
            }

            if (! Schema::hasColumn('ai_usage_logs', 'retrieval_ms')) {
                $table->unsignedInteger('retrieval_ms')->nullable()->after('first_token_ms');
            }

            if (! Schema::hasColumn('ai_usage_logs', 'retrieval_source_count')) {
                $table->unsignedSmallInteger('retrieval_source_count')->nullable()->after('retrieval_ms');
            }

            if (! Schema::hasColumn('ai_usage_logs', 'document_page_count')) {
                $table->unsignedSmallInteger('document_page_count')->nullable()->after('retrieval_source_count');
            }
        });

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            /*
             * Index names are given explicitly and kept short. MySQL caps an
             * identifier at 64 characters and Laravel's generated name is
             * table + columns + suffix, which overruns on a table with a name
             * this long (error 1059).
             */
            $table->index(['feature', 'status'], 'ai_logs_feature_status_idx');
            $table->index('request_id', 'ai_logs_request_idx');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_usage_logs')) {
            return;
        }

        Schema::table('ai_usage_logs', function (Blueprint $table) {
            $table->dropIndex('ai_logs_feature_status_idx');
            $table->dropIndex('ai_logs_request_idx');

            $table->dropColumn([
                'request_id',
                'feature',
                'error_code',
                'fallback_provider',
                'cache_hit',
                'first_token_ms',
                'retrieval_ms',
                'retrieval_source_count',
                'document_page_count',
            ]);
        });
    }
};
