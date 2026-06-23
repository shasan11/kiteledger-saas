<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bank_account_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('fiscal_year_id')->nullable();
            $table->string('reference')->nullable();
            $table->date('statement_date');
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->decimal('opening_bank_balance', 18, 2)->default(0);
            $table->decimal('closing_bank_balance', 18, 2)->default(0);
            $table->decimal('software_balance', 18, 2)->default(0);
            $table->decimal('matched_amount', 18, 2)->default(0);
            $table->decimal('unmatched_bank_amount', 18, 2)->default(0);
            $table->decimal('unmatched_software_amount', 18, 2)->default(0);
            $table->decimal('reconciliation_difference', 18, 2)->default(0);
            $table->string('status', 16)->default('draft'); // draft, finalized, reopened
            $table->timestamp('finalized_at')->nullable();
            $table->unsignedBigInteger('finalized_by_id')->nullable();
            $table->text('remarks')->nullable();
            $table->unsignedBigInteger('user_add_id')->nullable();
            $table->timestamps();

            $table->index(['bank_account_id', 'statement_date']);
            $table->index(['bank_account_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliations');
    }
};
