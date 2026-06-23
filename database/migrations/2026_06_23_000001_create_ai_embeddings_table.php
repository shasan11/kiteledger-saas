<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-database vector store for the AI semantic search (RAG) feature. Kept in the
 * app's own DB so it ships and installs with no external vector service — the
 * whole "unzip and go" constraint for the CodeCanyon distribution.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_embeddings', function (Blueprint $table) {
            $table->id();
            $table->string('source_type', 60);          // e.g. invoice, journal_voucher
            $table->string('source_id', 64);             // source record key (UUID-safe)
            $table->string('branch_id', 64)->nullable(); // for branch-scoped retrieval
            $table->text('content');                     // the text that was embedded (citation snippet)
            $table->char('content_hash', 64);            // sha256(content) — skip re-embedding unchanged text
            $table->longText('vector');                  // JSON array of floats
            $table->unsignedSmallInteger('dims');        // vector length (must match the query vector)
            $table->string('provider', 40);
            $table->string('model', 100);                // embedding model — re-index on change
            $table->timestamps();

            // Short, explicit index names (MySQL caps identifiers at 64 chars).
            $table->unique(['source_type', 'source_id'], 'ai_emb_source_unique');
            $table->index('branch_id', 'ai_emb_branch_idx');
            $table->index(['dims', 'model'], 'ai_emb_dims_model_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_embeddings');
    }
};
