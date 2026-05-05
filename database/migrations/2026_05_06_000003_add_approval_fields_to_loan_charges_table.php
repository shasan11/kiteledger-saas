<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_charges', function (Blueprint $table) {
            $table->string('charge_no', 40)->nullable()->unique()->after('loan_account_id');
            $table->boolean('approved')->default(false)->after('notes');
            $table->dateTime('approved_at')->nullable()->after('approved');
            $table->foreignId('approved_by_id')->nullable()->constrained('users')->after('approved_at');
            $table->boolean('void')->default(false)->after('approved_by_id');
            $table->foreignId('voided_by_id')->nullable()->constrained('users')->after('void');
            $table->text('voided_reason')->nullable()->after('voided_by_id');
            $table->dateTime('voided_at')->nullable()->after('voided_reason');
            $table->enum('status', ['draft', 'posted', 'cancelled'])->default('draft')->after('voided_at');
        });
    }

    public function down(): void
    {
        Schema::table('loan_charges', function (Blueprint $table) {
            $table->dropUnique(['charge_no']);
            $table->dropForeign(['approved_by_id']);
            $table->dropForeign(['voided_by_id']);
            $table->dropColumn([
                'charge_no',
                'approved',
                'approved_at',
                'approved_by_id',
                'void',
                'voided_by_id',
                'voided_reason',
                'voided_at',
                'status',
            ]);
        });
    }
};
