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

        Schema::create('app_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('company_name', 180);
            $table->string('tag_line', 200)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('website', 180)->nullable();
            $table->text('footer')->nullable();
            $table->string('logo', 255)->nullable();
            $table->enum('suggest_selling', ["recent","fixed"])->default('recent');
            $table->enum('negative_cash_balance', ["reject","warn","do_nothing"])->default('warn');
            $table->enum('negative_item_balance', ["reject","warn","do_nothing"])->default('warn');
            $table->enum('credit_limit_exceed', ["reject","warn","do_nothing"])->default('warn');
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
        Schema::dropIfExists('app_settings');
    }
};
