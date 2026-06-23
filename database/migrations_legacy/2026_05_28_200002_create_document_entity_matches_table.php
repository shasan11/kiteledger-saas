<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_entity_matches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_upload_id')->constrained('document_uploads')->cascadeOnDelete();
            $table->foreignUuid('document_extraction_id')->nullable()->constrained('document_extractions')->nullOnDelete();
            $table->string('entity_type', 60);
            $table->string('extracted_name')->nullable();
            $table->string('matched_model', 120)->nullable();
            $table->uuid('matched_id')->nullable();
            $table->string('match_status', 32)->default('unmatched');
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->json('options')->nullable();
            $table->uuid('created_record_id')->nullable();
            $table->timestamps();

            $table->index(['document_upload_id', 'entity_type']);
            $table->index('match_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_entity_matches');
    }
};
