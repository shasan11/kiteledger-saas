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

        Schema::create('designations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('department_id')->nullable()->constrained();
            $table->string('name', 120);
            $table->string('code', 30)->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->unique(['branch_id', 'name']);
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('designations');
    }
};
