<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_cash_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('pos_terminal_id')->constrained('pos_terminals');
            $table->foreignUuid('pos_shift_id')->constrained('pos_shifts');
            $table->string('movement_no', 40)->nullable()->unique();
            $table->dateTime('movement_date');
            $table->enum('type', ['cash_in', 'cash_out', 'expense', 'drop'])->default('cash_in');
            $table->decimal('amount', 16, 2)->default(0);
            $table->string('reason', 180)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('account_id')->nullable()->constrained('accounts');
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['pos_shift_id', 'approved']);
            $table->index(['pos_terminal_id', 'movement_date']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_cash_movements');
    }
};
