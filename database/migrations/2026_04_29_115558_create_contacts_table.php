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

        Schema::create('contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('contact_group_id')->nullable()->constrained();
            $table->foreignUuid('account_id')->nullable()->constrained();
            $table->enum('contact_type', ["customer","supplier","lead"])->default('customer');
            $table->string('name', 180);
            $table->string('code', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('pan', 80)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->boolean('accept_purchase')->default(false);
            $table->foreignUuid('credit_term_id')->nullable()->constrained();
            $table->decimal('credit_limit', 16, 2)->default(0);
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
        Schema::dropIfExists('contacts');
    }
};
