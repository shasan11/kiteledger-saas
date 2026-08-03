<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_embeddings')) {
            return;
        }

        Schema::table('ai_embeddings', function (Blueprint $table): void {
            if (! Schema::hasColumn('ai_embeddings', 'knowledge_chunk_id')) {
                $table->unsignedBigInteger('knowledge_chunk_id')->nullable()->after('source_id');
                $table->index('knowledge_chunk_id', 'ai_emb_knowledge_chunk_idx');
            }
        });

        $driver = DB::connection()->getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $this->dropIndexIfPresent('ai_embeddings', 'ai_emb_source_unique');
            DB::statement('ALTER TABLE ai_embeddings MODIFY vector JSON NOT NULL');
        }

        $indexes = collect(Schema::getIndexes('ai_embeddings'))->pluck('name')->all();
        Schema::table('ai_embeddings', function (Blueprint $table) use ($driver, $indexes): void {
            if (in_array($driver, ['mysql', 'mariadb'], true) && ! in_array('ai_emb_source_provider_model_unique', $indexes, true)) {
                $table->unique(['source_type', 'source_id', 'provider', 'model'], 'ai_emb_source_provider_model_unique');
            }
            if (! in_array('ai_emb_source_updated_idx', $indexes, true)) {
                $table->index(['source_type', 'updated_at'], 'ai_emb_source_updated_idx');
            }
            if (! in_array('ai_emb_content_hash_idx', $indexes, true)) {
                $table->index(['content_hash'], 'ai_emb_content_hash_idx');
            }
        });
    }

    public function down(): void
    {
        // The migration is intentionally non-destructive on rollback; existing
        // embeddings remain usable by the legacy retrieval path.
    }

    private function dropIndexIfPresent(string $table, string $index): void
    {
        $exists = collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
        if ($exists) {
            DB::statement("ALTER TABLE {$table} DROP INDEX {$index}");
        }
    }
};
