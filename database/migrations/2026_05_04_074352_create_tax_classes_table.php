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

        Schema::create('tax_classes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->enum('country_code', ["NP","IN","US"]);
            $table->string('name', 120);
            $table->string('code', 30);
            $table->enum('tax_type', ["vat","gst","sales_tax","use_tax","withholding","tds","tcs","exempt","zero_rated"]);
            $table->enum('tax_behavior', ["standard","exempt","zero_rated","reverse_charge","out_of_scope"])->default('standard');
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->unique(['country_code', 'code']);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_classes');
    }
};
