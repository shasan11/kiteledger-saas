<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('emails', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sender_email', 180);
            $table->string('receiver_email', 180);
            $table->string('subject', 255);
            $table->text('body')->nullable();
            $table->string('email_status', 20)->default('PENDING');
            $table->boolean('active')->default(true);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['branch_id', 'email_status']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('emails');
    }
};
