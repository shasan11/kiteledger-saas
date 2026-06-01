<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_transaction_proposals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_upload_id')->constrained('document_uploads')->cascadeOnDelete();
            $table->foreignUuid('document_extraction_id')->nullable()->constrained('document_extractions')->nullOnDelete();
            $table->string('transaction_type', 60);
            $table->string('status', 32)->default('draft');
            $table->json('payload');
            $table->json('missing_fields')->nullable();
            $table->json('warnings')->nullable();
            $table->decimal('confidence_score', 5, 4)->nullable();
            $table->string('created_record_type', 120)->nullable();
            $table->uuid('created_record_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('document_upload_id');
            $table->index(['transaction_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_transaction_proposals');
    }
};
