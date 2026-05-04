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

        Schema::create('master_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('type', ["custom_status","lead_source","deal_stage","task_type","credit_term","cost_term","payment_mode","tds_type","industry","activity_type","lost_reason"]);
            $table->string('group', 80);
            $table->string('key', 120);
            $table->string('value', 180);
            $table->json('meta')->nullable();
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
        Schema::dropIfExists('master_data');
    }
};
