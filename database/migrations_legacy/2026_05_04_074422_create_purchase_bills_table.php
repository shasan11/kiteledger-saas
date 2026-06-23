<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('purchase_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->string('bill_no', 40)->unique();
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->foreignUuid('contact_id')->constrained();
            $table->foreignUuid('warehouse_id')->nullable()->constrained();
            $table->foreignUuid('currency_id')->nullable()->constrained();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('import_country', 80)->nullable();
            $table->date('import_date')->nullable();
            $table->string('import_document_number', 80)->nullable();
            $table->decimal('paid_total', 16, 2)->default(0);
            $table->decimal('balance_due', 16, 2)->default(0);
            $table->enum('status', ["draft","posted","part_paid","paid","void"])->default('draft');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(false);
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->boolean('void')->default(false);
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
            $table->text('voided_reason')->nullable();
            $table->dateTime('voided_at')->nullable();
            $table->decimal('exchange_rate', 18, 6)->default(1);
            $table->decimal('total', 18, 6)->default(0);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_bills');
    }
};
