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

        Schema::create('tax_jurisdictions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('country_code', ["NP","IN","US"]);
            $table->string('state_code', 20)->nullable();
            $table->string('county_name', 120)->nullable();
            $table->string('city_name', 120)->nullable();
            $table->string('name', 150);
            $table->string('code', 50)->nullable();
            $table->enum('tax_system', ["nepal_vat","india_gst","usa_sales_tax","withholding","custom"]);
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
        Schema::dropIfExists('tax_jurisdictions');
    }
};
