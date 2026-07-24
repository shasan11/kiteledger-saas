<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('central_notifications') || ! Schema::hasColumn('central_notifications', 'related_id')) {
            return;
        }

        $type = strtolower(Schema::getColumnType('central_notifications', 'related_id'));

        if (in_array($type, ['char', 'string', 'uuid'], true)) {
            return;
        }

        Schema::table('central_notifications', function (Blueprint $table): void {
            $table->uuid('related_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Keep this as UUID/string. Related central models can use UUID keys,
        // including tenant deletion requests and tenant records.
    }
};
