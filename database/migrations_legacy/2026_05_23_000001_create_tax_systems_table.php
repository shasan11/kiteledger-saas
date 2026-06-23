<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_systems', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('country_code', 2);
            $table->string('name', 150);
            $table->string('code', 80)->unique();
            $table->string('type', 50)->nullable(); // vat, gst, sales_tax, withholding, custom
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index('country_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_systems');
    }
};
