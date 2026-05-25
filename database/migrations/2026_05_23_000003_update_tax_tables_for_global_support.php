<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Converts hardcoded enum columns in all tax tables to open strings,
 * adds tax_system_id FK on tax_jurisdictions,
 * adds conditions/actions JSON columns on tax_rules,
 * and migrates existing enum data to the new tax_systems rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Widen enum → string columns ─────────────────────────────────────
        // MySQL/MariaDB — use raw DDL because doctrine/dbal enum changes are unreliable
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE tax_jurisdictions
                MODIFY COLUMN country_code VARCHAR(2)  NOT NULL,
                MODIFY COLUMN tax_system   VARCHAR(80) NOT NULL");

            DB::statement("ALTER TABLE tax_rates
                MODIFY COLUMN country_code VARCHAR(2)  NOT NULL,
                MODIFY COLUMN tax_type     VARCHAR(50) NOT NULL");

            DB::statement("ALTER TABLE tax_rules
                MODIFY COLUMN country_code VARCHAR(2) NOT NULL");

            DB::statement("ALTER TABLE tax_classes
                MODIFY COLUMN country_code VARCHAR(2)  NOT NULL,
                MODIFY COLUMN tax_type     VARCHAR(50) NOT NULL");

            DB::statement("ALTER TABLE product_tax_categories
                MODIFY COLUMN country_code VARCHAR(2) NOT NULL");

            DB::statement("ALTER TABLE tax_exemptions
                MODIFY COLUMN country_code VARCHAR(2) NOT NULL");
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't enforce enum constraints; columns are already text-compatible
        } elseif ($driver === 'pgsql') {
            // PostgreSQL: cast enum to text then alter
            foreach ([
                'tax_jurisdictions' => ['country_code', 'tax_system'],
                'tax_rates'         => ['country_code', 'tax_type'],
                'tax_rules'         => ['country_code'],
                'tax_classes'       => ['country_code', 'tax_type'],
                'product_tax_categories' => ['country_code'],
                'tax_exemptions'    => ['country_code'],
            ] as $table => $columns) {
                foreach ($columns as $col) {
                    DB::statement("ALTER TABLE {$table} ALTER COLUMN {$col} TYPE VARCHAR(80) USING {$col}::varchar");
                }
            }
        }

        // ── 2. Add tax_system_id FK to tax_jurisdictions ───────────────────────
        Schema::table('tax_jurisdictions', function (Blueprint $table) {
            $table->foreignUuid('tax_system_id')
                ->nullable()
                ->after('tax_system')
                ->constrained('tax_systems')
                ->nullOnDelete();
        });

        // ── 3. Add conditions + actions JSON to tax_rules ─────────────────────
        Schema::table('tax_rules', function (Blueprint $table) {
            $table->json('conditions')->nullable()->after('reverse_charge');
            $table->json('actions')->nullable()->after('conditions');
        });

        // ── 4. Seed built-in tax_systems rows from existing preset data ────────
        $systems = [
            ['country_code' => 'NP', 'code' => 'nepal_vat',     'name' => 'Nepal VAT',              'type' => 'vat'],
            ['country_code' => 'IN', 'code' => 'india_gst',     'name' => 'India GST',               'type' => 'gst'],
            ['country_code' => 'US', 'code' => 'usa_sales_tax', 'name' => 'USA Sales Tax',           'type' => 'sales_tax'],
            ['country_code' => 'GB', 'code' => 'gb_vat',        'name' => 'UK VAT',                  'type' => 'vat'],
            ['country_code' => 'FR', 'code' => 'france_tva',    'name' => 'France TVA',              'type' => 'vat'],
            ['country_code' => 'AE', 'code' => 'uae_vat',       'name' => 'UAE VAT',                 'type' => 'vat'],
            ['country_code' => 'AU', 'code' => 'australia_gst', 'name' => 'Australia GST',           'type' => 'gst'],
            ['country_code' => 'CA', 'code' => 'canada_gst',    'name' => 'Canada GST/HST',          'type' => 'gst'],
            ['country_code' => 'SG', 'code' => 'singapore_gst', 'name' => 'Singapore GST',           'type' => 'gst'],
            ['country_code' => 'NP', 'code' => 'nepal_withholding', 'name' => 'Nepal Withholding',   'type' => 'withholding'],
            ['country_code' => 'IN', 'code' => 'india_tds',     'name' => 'India TDS',               'type' => 'withholding'],
        ];

        $now = now();
        foreach ($systems as $system) {
            DB::table('tax_systems')->insertOrIgnore([
                'id'                  => \Illuminate\Support\Str::uuid()->toString(),
                'country_code'        => $system['country_code'],
                'code'                => $system['code'],
                'name'                => $system['name'],
                'type'                => $system['type'],
                'active'              => true,
                'is_system_generated' => true,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);
        }

        // ── 5. Link existing jurisdictions to their tax_system rows ───────────
        $jurisdictions = DB::table('tax_jurisdictions')->get(['id', 'tax_system']);
        foreach ($jurisdictions as $j) {
            $system = DB::table('tax_systems')->where('code', $j->tax_system)->first(['id']);
            if ($system) {
                DB::table('tax_jurisdictions')
                    ->where('id', $j->id)
                    ->update(['tax_system_id' => $system->id]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tax_rules', function (Blueprint $table) {
            $table->dropColumn(['conditions', 'actions']);
        });

        Schema::table('tax_jurisdictions', function (Blueprint $table) {
            $table->dropForeign(['tax_system_id']);
            $table->dropColumn('tax_system_id');
        });

        // Restoring enum columns on down is intentionally omitted — the data
        // may now contain values outside the original enum set.
    }
};
