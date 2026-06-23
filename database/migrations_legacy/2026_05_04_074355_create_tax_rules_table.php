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

        Schema::create('tax_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->foreignUuid('tax_rate_id')->constrained();
            $table->foreignUuid('product_tax_category_id')->nullable()->constrained();
            $table->enum('country_code', ["NP","IN","US"]);
            $table->enum('transaction_type', ["sale","purchase","expense","import","export"]);
            $table->enum('customer_type', ["registered","unregistered","consumer","business","exempt","any"])->default('any');
            $table->enum('supply_type', ["local","intrastate","interstate","import","export","any"])->default('any');
            $table->string('from_state_code', 20)->nullable();
            $table->string('to_state_code', 20)->nullable();
            $table->boolean('reverse_charge')->default(false);
            $table->unsignedSmallInteger('priority')->default(100);
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
        Schema::dropIfExists('tax_rules');
    }
};
