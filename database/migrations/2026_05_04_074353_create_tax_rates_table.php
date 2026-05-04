<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('tax_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_class_id')->constrained();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->enum('country_code', ["NP","IN","US"]);
            $table->enum('tax_type', ["vat","gst","sales_tax","use_tax","withholding","tds","tcs"]);
            $table->string('name', 120);
            $table->string('code', 50)->nullable();
            $table->decimal('rate_percent', 8, 4)->default(0);
            $table->boolean('inclusive')->default(false);
            $table->enum('calculation_method', ["single","split","compound"])->default('single');
            $table->enum('applies_on', ["sale","purchase","both","expense"])->default('both');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('report_code', 80)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
