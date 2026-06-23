<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_extractions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_upload_id')->constrained('document_uploads')->cascadeOnDelete();
            $table->string('provider', 60)->nullable();
            $table->string('model', 120)->nullable();
            $table->longText('raw_text')->nullable();
            $table->json('extracted_json')->nullable();
            $table->json('normalized_json')->nullable();
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->string('status', 32)->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('document_upload_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_extractions');
    }
};
