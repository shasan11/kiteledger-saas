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

        Schema::create('custom_field_validations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('custom_field_id')->constrained();
            $table->enum('rule', ["min","max","min_length","max_length","regex","email","url","numeric","integer","decimal","date","before","after","in","not_in"]);
            $table->string('value', 255)->nullable();
            $table->string('message', 255)->nullable();
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
        Schema::dropIfExists('custom_field_validations');
    }
};
