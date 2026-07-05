<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        if (! app()->environment('testing')) {
            return;
        }
        foreach (glob(database_path('migrations/tenant/*.php')) ?: [] as $file) {
            $migration = require $file;
            $migration->up();
        }
    }

    public function down(): void
    {
        if (! app()->environment('testing')) {
            return;
        }
        foreach (array_reverse(glob(database_path('migrations/tenant/*.php')) ?: []) as $file) {
            (require $file)->down();
        }
    }
};
