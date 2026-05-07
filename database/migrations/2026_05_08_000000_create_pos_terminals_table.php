<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('pos_terminals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('warehouse_id')->nullable()->constrained();
            $table->string('name', 150);
            $table->string('code', 40)->unique();
            $table->string('location', 150)->nullable();
            $table->string('receipt_printer_name', 120)->nullable();
            $table->foreignUuid('cash_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('card_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('online_account_id')->nullable()->constrained('accounts');
            $table->foreignUuid('default_customer_id')->nullable()->constrained('contacts');
            $table->boolean('is_default')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('is_system_generated')->default(false);
            $table->foreignId('user_add_id')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['branch_id', 'active']);
            $table->index(['warehouse_id', 'active']);
            $table->index(['is_default', 'active']);
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_terminals');
    }
};
