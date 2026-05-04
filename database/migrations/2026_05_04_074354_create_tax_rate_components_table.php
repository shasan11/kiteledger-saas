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

        Schema::create('tax_rate_components', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_rate_id')->constrained();
            $table->string('component_name', 80);
            $table->enum('component_type', ["vat","cgst","sgst","igst","state_tax","county_tax","city_tax","special_tax","tds","tcs","withholding"]);
            $table->decimal('rate_percent', 8, 4)->default(0);
            $table->foreignUuid('account_id')->nullable()->constrained('chart_of_accounts');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->foreignId('chart_of_account_id');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_rate_components');
    }
};
