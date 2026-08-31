<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_leads', function (Blueprint $table): void {
            $table->id();
            $table->string('type')->default('contact')->index();
            $table->string('name');
            $table->string('email')->index();
            $table->string('company')->nullable();
            $table->string('phone', 60)->nullable();
            $table->string('company_size', 60)->nullable();
            $table->text('message')->nullable();
            $table->string('source')->nullable();
            $table->string('status')->default('new')->index();
            $table->foreignId('assigned_to')->nullable()->constrained('central_admin_users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('contacted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_leads');
    }
};
