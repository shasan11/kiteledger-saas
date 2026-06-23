<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('reporting_tag_values')) {
            return;
        }

        Schema::disableForeignKeyConstraints();

        Schema::create('reporting_tag_values', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('reporting_tag_id');
            $table->uuid('reporting_tag_line_id')->nullable();

            // Polymorphic owner (Invoice, Quotation, JournalVoucher, ...).
            // uuidMorphs creates taggable_id (uuid) + taggable_type (string) + index.
            $table->uuidMorphs('taggable');

            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 6)->nullable();
            $table->date('value_date')->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->json('value_json')->nullable();

            $table->timestamps();

            $table->index('reporting_tag_id');
            $table->unique(['taggable_type', 'taggable_id', 'reporting_tag_id'], 'reporting_tag_values_owner_tag_unique');

            $table->foreign('reporting_tag_id')->references('id')->on('reporting_tags')->cascadeOnDelete();
            $table->foreign('reporting_tag_line_id')->references('id')->on('reporting_tag_lines')->nullOnDelete();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('reporting_tag_values');
    }
};
