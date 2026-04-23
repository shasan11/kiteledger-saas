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
            $table->foreignUuid('branch_id')->constrained();
            $table->string('bill_no', 40)->unique();
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->foreignUuid('contact_id')->constrained();
            $table->foreignUuid('warehouse_id')->nullable()->constrained();
            $table->foreignUuid('currency_id')->nullable()->constrained();
            $table->decimal('exchange_rate', 16, 6)->default(1);
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('import_country', 80)->nullable();
            $table->date('import_date')->nullable();
            $table->string('import_document_number', 80)->nullable();
            $table->decimal('paid_total', 16, 2)->default(0);
            $table->decimal('balance_due', 16, 2)->default(0);
            $table->enum('status', ["draft","posted","part_paid","paid","void"])->default('draft');
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->boolean('active')->default(true);
            $table->boolean('approved')->default(true);
            $table->boolean('voided')->default(false);
            $table->text('voided_reason')->nullable();
            $table->date('voided_date')->nullable();
            $table->foreignId('voided_by_id')->nullable()->constrained('users');
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
