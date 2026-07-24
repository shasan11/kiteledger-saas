<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payment_gateways') || ! Schema::hasColumn('payment_gateways', 'config')) {
            return;
        }

        $type = strtolower(Schema::getColumnType('payment_gateways', 'config'));

        if (in_array($type, ['text', 'longtext'], true)) {
            return;
        }

        Schema::table('payment_gateways', function (Blueprint $table): void {
            $table->longText('config')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Encrypted ciphertext is not valid JSON, so reverting the column type
        // would corrupt or reject existing gateway configuration values.
    }
};
