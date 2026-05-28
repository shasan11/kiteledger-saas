<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cheque_format_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('country', 100);
            $table->string('format_name', 150);
            $table->string('paper_size', 50)->nullable();
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->string('date_position', 120)->nullable();
            $table->string('payee_name_position', 120)->nullable();
            $table->string('amount_number_position', 120)->nullable();
            $table->string('amount_words_position', 120)->nullable();
            $table->string('signature_position', 120)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['country', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheque_format_configurations');
    }
};
