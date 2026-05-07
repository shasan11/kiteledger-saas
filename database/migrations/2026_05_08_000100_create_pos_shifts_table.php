<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('pos_terminal_id')->constrained('pos_terminals');
            $table->foreignId('cashier_id')->constrained('users');
            $table->string('shift_no', 40)->nullable()->unique();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->decimal('opening_cash', 16, 2)->default(0);
            $table->decimal('expected_cash', 16, 2)->default(0);
            $table->decimal('counted_cash', 16, 2)->default(0);
            $table->decimal('cash_difference', 16, 2)->default(0);
            $table->decimal('total_sales', 16, 2)->default(0);
            $table->decimal('total_cash_sales', 16, 2)->default(0);
            $table->decimal('total_card_sales', 16, 2)->default(0);
            $table->decimal('total_online_sales', 16, 2)->default(0);
            $table->decimal('total_refunds', 16, 2)->default(0);
            $table->decimal('total_expenses', 16, 2)->default(0);
            $table->text('notes')->nullable();
            $table->text('closing_notes')->nullable();
            $table->enum('status', ['open', 'closed', 'cancelled'])->default('open');
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['pos_terminal_id', 'status']);
            $table->index(['cashier_id', 'status']);
            $table->index(['branch_id', 'status']);
            $table->index(['opened_at']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_shifts');
    }
};
