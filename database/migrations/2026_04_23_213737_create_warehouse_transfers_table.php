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

        Schema::create('warehouse_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained();
            $table->string('transfer_no', 40)->unique();
            $table->date('transfer_date');
            $table->foreignUuid('from_warehouse_id')->constrained('warehouses');
            $table->foreignUuid('to_warehouse_id')->constrained('warehouses');
            $table->text('notes')->nullable();
            $table->enum('status', ["draft","posted","cancelled"])->default('draft');
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
        Schema::dropIfExists('warehouse_transfers');
    }
};
