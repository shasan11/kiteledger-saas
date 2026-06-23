<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_ticket_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('support_ticket_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('type', 30)->default('public_reply');
            $table->text('body');
            $table->json('attachments')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            $table->index('support_ticket_id');
            $table->index('user_id');
            $table->index(['support_ticket_id', 'is_internal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_comments');
    }
};
