<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_report_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('country_code', 2);
            $table->foreignUuid('tax_system_id')->nullable()->constrained('tax_systems')->nullOnDelete();
            $table->string('report_key', 120);
            $table->string('report_name', 180);
            $table->text('description')->nullable();
            $table->json('columns_json')->nullable();
            $table->json('mapping_json')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->timestamps();

            $table->unique(['country_code', 'report_key']);
            $table->index('country_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_report_templates');
    }
};
