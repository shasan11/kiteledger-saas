<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('in_time');
            $table->dateTime('out_time')->nullable();
            $table->string('ip', 60)->nullable();
            $table->string('comment', 255)->nullable();
            $table->foreignId('punch_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('total_hour', 8, 2)->nullable();
            $table->string('in_time_status', 30)->nullable();
            $table->string('out_time_status', 30)->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'in_time']);
            $table->index('branch_id');
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
