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

        Schema::create('loan_top_ups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('loan_account_id')->constrained();
            $table->date('topup_date');
            $table->foreignUuid('loan_received_in_account_id')->constrained('accounts');
            $table->decimal('amount', 18, 6)->default(0);
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
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
        Schema::dropIfExists('loan_top_ups');
    }
};
