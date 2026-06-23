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

        Schema::create('tax_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->enum('registration_type', ["pan","vat","gstin","tan","ein","sales_tax_permit","state_tax_id"]);
            $table->string('registration_no', 80);
            $table->string('legal_name', 180)->nullable();
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
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
        Schema::dropIfExists('tax_registrations');
    }
};
