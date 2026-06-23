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

        Schema::create('quotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('contact_id')->constrained();
            $table->string('quotation_no', 40)->unique()->nullable();
            $table->date('quotation_date');
            $table->date('expiry_date')->nullable();
            $table->foreignUuid('credit_term_id')->nullable()->constrained();
            $table->foreignUuid('currency_id')->nullable()->constrained();
            $table->text('notes')->nullable();
            $table->enum('status', ["draft","sent","accepted","rejected","expired","cancelled"])->default('draft');
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
        Schema::dropIfExists('quotations');
    }
};
