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

        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('lead_no', 40)->unique()->nullable();
            $table->foreignUuid('contact_id')->nullable()->constrained();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users');
            $table->foreignUuid('converted_contact_id')->nullable()->constrained('contacts');
            $table->foreignUuid('converted_deal_id')->nullable()->constrained('deals');
            $table->string('name', 180);
            $table->string('company_name', 180)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('mobile', 40)->nullable();
            $table->string('website', 180)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 80)->nullable();
            $table->string('state', 80)->nullable();
            $table->string('country', 80)->nullable();
            $table->string('lead_source', 80)->nullable();
            $table->string('industry', 120)->nullable();
            $table->decimal('expected_value', 16, 2)->default(0)->nullable();
            $table->enum('status', ["new","contacted","qualified","unqualified","converted","lost"])->default('new');
            $table->enum('priority', ["low","medium","high","urgent"])->default('medium');
            $table->dateTime('next_follow_up_date')->nullable();
            $table->dateTime('last_contacted_at')->nullable();
            $table->text('notes')->nullable();
            $table->dateTime('converted_at')->nullable();
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
        Schema::dropIfExists('leads');
    }
};
