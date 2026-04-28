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

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained();
            $table->foreignUuid('product_category_id')->nullable()->constrained();
            $table->string('name', 180);
            $table->string('code', 60)->nullable();
            $table->string('barcode', 80)->nullable();
            $table->text('description')->nullable();
            $table->foreignUuid('product_unit_id')->nullable()->constrained();
            $table->foreignUuid('tax_class_id')->nullable()->constrained();
            $table->boolean('track_inventory')->default(true);
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
        Schema::dropIfExists('products');
    }
};
