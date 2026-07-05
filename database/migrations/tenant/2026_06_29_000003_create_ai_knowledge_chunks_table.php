<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_knowledge_chunks')) {
            $this->ensureFullTextIndex();

            return;
        }

        Schema::create('ai_knowledge_chunks', function (Blueprint $table): void {
            $table->id();
            $table->string('source_type', 80);
            $table->string('source_id', 191);
            $table->string('module', 100)->nullable();
            $table->string('title', 255);
            $table->longText('content');
            $table->string('route', 500)->nullable();
            $table->string('permission', 160)->nullable();
            $table->json('keywords')->nullable();
            $table->json('metadata')->nullable();
            $table->string('branch_id', 64)->nullable();
            $table->string('fiscal_year_id', 64)->nullable();
            $table->char('content_hash', 64);
            $table->timestamps();
            $table->unique(['source_type', 'source_id'], 'ai_knowledge_source_unique');
            $table->index(['source_type', 'module'], 'ai_knowledge_type_module_idx');
            $table->index(['branch_id', 'fiscal_year_id'], 'ai_knowledge_scope_idx');
            $table->index(['updated_at'], 'ai_knowledge_updated_idx');
        });

        $this->ensureFullTextIndex();
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_knowledge_chunks');
    }

    private function ensureFullTextIndex(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $exists = collect(DB::select("SHOW INDEX FROM ai_knowledge_chunks WHERE Key_name = 'ai_knowledge_search_fulltext'"))->isNotEmpty();
        if (! $exists) {
            DB::statement('ALTER TABLE ai_knowledge_chunks ADD FULLTEXT ai_knowledge_search_fulltext (title, content)');
        }
    }
};
