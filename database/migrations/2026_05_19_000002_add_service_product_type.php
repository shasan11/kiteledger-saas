<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        try {
            DB::statement("ALTER TABLE products MODIFY product_type ENUM('simple','service','variant_parent','variant') NOT NULL DEFAULT 'simple'");
        } catch (\Throwable) {
            //
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        DB::table('products')->where('product_type', 'service')->update(['product_type' => 'simple']);

        try {
            DB::statement("ALTER TABLE products MODIFY product_type ENUM('simple','variant_parent','variant') NOT NULL DEFAULT 'simple'");
        } catch (\Throwable) {
            //
        }
    }
};
