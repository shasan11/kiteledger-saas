<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('central_audit_logs') || ! Schema::hasColumn('central_audit_logs', 'model_id')) {
            return;
        }

        $type = strtolower(Schema::getColumnType('central_audit_logs', 'model_id'));

        if (in_array($type, ['char', 'string', 'uuid'], true)) {
            return;
        }

        Schema::table('central_audit_logs', function (Blueprint $table): void {
            $table->uuid('model_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Do not narrow this back to an integer: central models such as tenants
        // use UUID primary keys, and existing audit rows may already contain them.
    }
};
