<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_organization_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('central_user_id')->constrained('central_users')->cascadeOnDelete();
            $table->string('company_name');
            $table->string('legal_name')->nullable();
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->string('country', 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('central_organization_requests');
    }
};
