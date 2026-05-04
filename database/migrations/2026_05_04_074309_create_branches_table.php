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

        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_head_office')->default(false);
            $table->boolean('is_transaction_enabled')->default(true);
            $table->boolean('is_pos_enabled')->default(true);
            $table->boolean('is_warehouse_enabled')->default(true);
            $table->boolean('is_ai_enabled')->default(true);
            $table->boolean('is_billing_location_enabled')->default(true);
            $table->boolean('abbreviated_tax_enabled')->default(true);
            $table->boolean('track_location')->default(true);
            $table->string('logo', 255)->nullable();
            $table->string('favicon', 255)->nullable();
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
        Schema::dropIfExists('branches');
    }
};
