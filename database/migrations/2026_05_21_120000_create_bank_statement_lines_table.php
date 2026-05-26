<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bank_account_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->date('statement_date');
            $table->string('description')->nullable();
            $table->string('reference')->nullable();
            $table->decimal('debit', 18, 2)->default(0);
            $table->decimal('credit', 18, 2)->default(0);
            $table->decimal('balance', 18, 2)->nullable();
            $table->string('counterparty')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('imported');
            $table->unsignedBigInteger('imported_by_id')->nullable();
            $table->uuid('posted_journal_voucher_id')->nullable();
            $table->timestamps();

            $table->index(['bank_account_id', 'statement_date']);
            $table->index(['reference', 'statement_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_statement_lines');
    }
};
