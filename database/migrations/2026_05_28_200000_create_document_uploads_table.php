<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_uploads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('label');
            $table->string('original_file_name');
            $table->string('file_path');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('file_hash', 64)->nullable();
            $table->string('document_type', 60)->default('unknown');
            $table->string('status', 32)->default('uploaded');
            $table->foreignUuid('branch_id')->nullable();
            $table->foreignUuid('fiscal_year_id')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('document_type');
            $table->index('file_hash');
            $table->index(['branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_uploads');
    }
};
