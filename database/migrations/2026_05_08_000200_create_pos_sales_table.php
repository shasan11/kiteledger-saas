<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('pos_terminal_id')->constrained('pos_terminals');
            $table->foreignUuid('pos_shift_id')->constrained('pos_shifts');
            $table->foreignUuid('warehouse_id')->nullable()->constrained();
            $table->foreignUuid('contact_id')->nullable()->constrained('contacts');
            $table->foreignUuid('invoice_id')->nullable()->constrained('invoices');
            $table->foreignUuid('customer_payment_id')->nullable()->constrained('customer_payments');
            $table->foreignUuid('sales_return_id')->nullable()->constrained('sales_returns');
            $table->string('sale_no', 40)->nullable()->unique();
            $table->dateTime('sale_date');
            $table->string('customer_name', 180)->nullable();
            $table->string('customer_phone', 40)->nullable();
            $table->string('customer_email', 120)->nullable();
            $table->decimal('subtotal', 16, 2)->default(0);
            $table->decimal('discount_total', 16, 2)->default(0);
            $table->decimal('tax_total', 16, 2)->default(0);
            $table->decimal('round_off', 16, 2)->default(0);
            $table->decimal('grand_total', 16, 2)->default(0);
            $table->decimal('paid_total', 16, 2)->default(0);
            $table->decimal('balance_due', 16, 2)->default(0);
            $table->decimal('change_amount', 16, 2)->default(0);
            $table->enum('status', ['draft', 'held', 'completed', 'refunded', 'part_refunded', 'cancelled'])->default('draft');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])->default('unpaid');
            $table->text('notes')->nullable();
            $table->text('receipt_note')->nullable();
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('void')->default(false);
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['pos_terminal_id', 'status']);
            $table->index(['pos_shift_id', 'status']);
            $table->index(['branch_id', 'status']);
            $table->index(['sale_date']);
            $table->index(['contact_id', 'status']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sales');
    }
};
