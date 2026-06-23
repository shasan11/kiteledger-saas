<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_upload_id')->constrained('document_uploads')->cascadeOnDelete();
            $table->string('linkable_type', 120);
            $table->uuid('linkable_id');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['linkable_type', 'linkable_id']);
            $table->index('document_upload_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_links');
    }
};
