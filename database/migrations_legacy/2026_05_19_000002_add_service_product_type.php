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

        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildSqlite();
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

    private function rebuildSqlite(): void
    {
        $hasVariantSignature = Schema::hasColumn('products', 'variant_signature');

        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement('CREATE TABLE IF NOT EXISTS products_new (
            id varchar not null primary key,
            parent_id varchar,
            product_category_id varchar,
            product_tax_category_id varchar,
            name varchar not null,
            code varchar,
            sku varchar,
            barcode varchar,
            description text,
            product_unit_id varchar,
            tax_class_id varchar,
            product_type varchar not null default "simple" check ("product_type" in ("simple", "service", "variant_parent", "variant")),
            variant_signature varchar,
            sales_account_id varchar,
            purchase_account_id varchar,
            sales_return_account_id varchar,
            purchase_return_account_id varchar,
            valuation_method varchar not null default "standard" check ("valuation_method" in ("standard", "average_cost", "first_in_first_out", "last_in_first_out")),
            reorder_level numeric not null default 0,
            purchase_price numeric not null default 0,
            selling_price numeric not null default 0,
            track_inventory tinyint(1) not null default 1,
            allow_sale tinyint(1) not null default 1,
            allow_purchase tinyint(1) not null default 1,
            active tinyint(1) not null default 1,
            is_system_generated tinyint(1) not null default 0,
            user_add_id integer,
            created_at datetime,
            updated_at datetime,
            foreign key(parent_id) references products(id),
            foreign key(product_category_id) references product_categories(id),
            foreign key(product_tax_category_id) references product_tax_categories(id),
            foreign key(product_unit_id) references product_units(id),
            foreign key(tax_class_id) references tax_classes(id),
            foreign key(sales_account_id) references accounts(id),
            foreign key(purchase_account_id) references accounts(id),
            foreign key(sales_return_account_id) references accounts(id),
            foreign key(purchase_return_account_id) references accounts(id),
            foreign key(user_add_id) references users(id)
        )');

        $variantSignatureSelect = $hasVariantSignature ? 'variant_signature' : 'NULL as variant_signature';

        DB::statement('INSERT INTO products_new
            (id, parent_id, product_category_id, product_tax_category_id, name, code, sku, barcode,
             description, product_unit_id, tax_class_id, product_type, variant_signature,
             sales_account_id, purchase_account_id, sales_return_account_id, purchase_return_account_id,
             valuation_method, reorder_level, purchase_price, selling_price, track_inventory,
             allow_sale, allow_purchase, active, is_system_generated, user_add_id, created_at, updated_at)
            SELECT id, parent_id, product_category_id, product_tax_category_id, name, code, sku, barcode,
                   description, product_unit_id, tax_class_id, product_type, ' . $variantSignatureSelect . ',
                   sales_account_id, purchase_account_id, sales_return_account_id, purchase_return_account_id,
                   COALESCE(valuation_method, "standard"), reorder_level, purchase_price, selling_price,
                   track_inventory, allow_sale, allow_purchase, active, is_system_generated, user_add_id,
                   created_at, updated_at
            FROM products');

        DB::statement('DROP TABLE products');
        DB::statement('ALTER TABLE products_new RENAME TO products');
        DB::statement('PRAGMA foreign_keys = ON');
    }
};
