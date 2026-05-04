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

        Schema::create('expense_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('expense_id')->constrained();
            $table->foreignUuid('chart_of_account_id')->constrained();
            $table->string('description', 200)->nullable();
            $table->foreignUuid('tax_rate_id')->nullable()->constrained();
            $table->foreignUuid('tax_jurisdiction_id')->nullable()->constrained();
            $table->decimal('amount', 16, 2)->default(0);
            $table->decimal('tax_amount', 16, 2)->default(0);
            $table->json('tax_breakup')->nullable();
            $table->decimal('line_total', 16, 2)->default(0);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_lines');
    }
};
