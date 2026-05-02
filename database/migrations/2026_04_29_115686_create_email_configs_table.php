<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('email_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email_config_name', 120);
            $table->string('email_host', 180);
            $table->unsignedSmallInteger('email_port');
            $table->string('email_user', 180);
            $table->string('email_pass', 255);
            $table->boolean('active')->default(true);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('email_configs');
    }
};
