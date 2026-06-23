<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('pos_sale_id')->constrained('pos_sales');
            $table->foreignUuid('sales_return_id')->nullable()->constrained('sales_returns');
            $table->foreignUuid('pos_shift_id')->nullable()->constrained('pos_shifts');
            $table->string('return_no', 40)->nullable()->unique();
            $table->dateTime('return_date');
            $table->decimal('refund_amount', 16, 2)->default(0);
            $table->enum('refund_method', ['cash', 'card', 'online', 'wallet', 'store_credit'])->default('cash');
            $table->string('reason', 180)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('draft');
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('active')->default(true);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['pos_sale_id', 'status']);
            $table->index(['pos_shift_id', 'status']);
            $table->index(['return_date']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_returns');
    }
};
