<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_reconciliation_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bank_reconciliation_id')->constrained()->cascadeOnDelete();
            $table->uuid('bank_statement_line_id')->nullable();
            $table->uuid('journal_voucher_line_id')->nullable();
            // matched, unmatched_bank, unmatched_software, pending, ignored, adjustment
            $table->string('type', 24);
            $table->decimal('amount', 18, 2)->default(0);
            $table->decimal('difference', 18, 2)->default(0);
            $table->string('match_confidence', 16)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index('bank_statement_line_id');
            $table->index('journal_voucher_line_id');
            $table->index(['bank_reconciliation_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliation_items');
    }
};
