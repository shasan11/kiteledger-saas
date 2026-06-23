<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (! Schema::hasColumn('products', 'variant_signature')) {
                    $column = $table->string('variant_signature', 1000)->nullable()->after('product_type');

                    if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
                        $column->charset('ascii')->collation('ascii_bin');
                    }
                }
            });

            $this->ensureVariantSignatureUsesIndexSafeCharset();

            $this->addIndexIfMissing('products', 'products_parent_type_index', ['parent_id', 'product_type']);
            $this->addIndexIfMissing('products', 'products_sku_index', ['sku']);
            $this->addIndexIfMissing('products', 'products_barcode_index', ['barcode']);
            $this->addIndexIfMissing('products', 'products_parent_variant_signature_unique', ['parent_id', 'variant_signature'], true);
        }

        if (Schema::hasTable('product_variant_items')) {
            DB::table('product_variant_items')
                ->select('product_id', 'variant_line_id', DB::raw('MIN(id) as keep_id'), DB::raw('COUNT(*) as duplicate_count'))
                ->groupBy('product_id', 'variant_line_id')
                ->having('duplicate_count', '>', 1)
                ->get()
                ->each(function ($row) {
                    DB::table('product_variant_items')
                        ->where('product_id', $row->product_id)
                        ->where('variant_line_id', $row->variant_line_id)
                        ->where('id', '<>', $row->keep_id)
                        ->delete();
                });

            $this->addIndexIfMissing('product_variant_items', 'pvi_product_variant_line_unique', ['product_id', 'variant_line_id'], true);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('product_variant_items')) {
            $this->dropIndexIfExists('product_variant_items', 'pvi_product_variant_line_unique');
        }

        if (Schema::hasTable('products')) {
            $this->dropIndexIfExists('products', 'products_parent_variant_signature_unique');
            $this->dropIndexIfExists('products', 'products_barcode_index');
            $this->dropIndexIfExists('products', 'products_sku_index');
            $this->dropIndexIfExists('products', 'products_parent_type_index');

            if (Schema::hasColumn('products', 'variant_signature')) {
                Schema::table('products', function (Blueprint $table) {
                    $table->dropColumn('variant_signature');
                });
            }
        }
    }

    private function addIndexIfMissing(string $table, string $index, array $columns, bool $unique = false): void
    {
        if ($this->indexExists($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($index, $columns, $unique) {
            $unique
                ? $blueprint->unique($columns, $index)
                : $blueprint->index($columns, $index);
        });
    }

    private function dropIndexIfExists(string $table, string $index): void
    {
        if (! $this->indexExists($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($index) {
            $blueprint->dropIndex($index);
        });
    }

    private function ensureVariantSignatureUsesIndexSafeCharset(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::statement('ALTER TABLE `products` MODIFY `variant_signature` VARCHAR(1000) CHARACTER SET ascii COLLATE ascii_bin NULL');
    }

    private function indexExists(string $table, string $index): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('{$table}')"))
                ->contains(fn ($row) => ($row->name ?? null) === $index);
        }

        $database = DB::getDatabaseName();

        return DB::table('information_schema.statistics')
            ->where('table_schema', $database)
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }
};
