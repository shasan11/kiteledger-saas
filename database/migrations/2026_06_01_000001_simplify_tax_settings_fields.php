<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tax_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('tax_settings', 'tax_label')) {
                $table->string('tax_label', 30)->default('VAT')->after('registration_type');
            }
            if (! Schema::hasColumn('tax_settings', 'custom_tax_label')) {
                $table->string('custom_tax_label', 60)->nullable()->after('tax_label');
            }
            if (! Schema::hasColumn('tax_settings', 'tax_calculation_type')) {
                $table->string('tax_calculation_type', 20)->default('exclusive')->after('default_purchase_tax_rate_id');
            }
            if (! Schema::hasColumn('tax_settings', 'tax_rounding_method')) {
                $table->string('tax_rounding_method', 20)->default('document')->after('tax_calculation_type');
            }
            if (! Schema::hasColumn('tax_settings', 'show_tax_on_invoice')) {
                $table->boolean('show_tax_on_invoice')->default(true)->after('tax_rounding_method');
            }
            if (! Schema::hasColumn('tax_settings', 'sales_tax_calculation_type')) {
                $table->string('sales_tax_calculation_type', 20)->default('global')->after('show_tax_on_invoice');
            }
            if (! Schema::hasColumn('tax_settings', 'purchase_tax_calculation_type')) {
                $table->string('purchase_tax_calculation_type', 20)->default('global')->after('sales_tax_calculation_type');
            }
            if (! Schema::hasColumn('tax_settings', 'allow_sales_tax_override')) {
                $table->boolean('allow_sales_tax_override')->default(true)->after('purchase_tax_calculation_type');
            }
            if (! Schema::hasColumn('tax_settings', 'allow_purchase_tax_override')) {
                $table->boolean('allow_purchase_tax_override')->default(true)->after('allow_sales_tax_override');
            }
            if (! Schema::hasColumn('tax_settings', 'show_tax_summary_on_bill')) {
                $table->boolean('show_tax_summary_on_bill')->default(true)->after('allow_purchase_tax_override');
            }
        });

        Schema::table('tax_rates', function (Blueprint $table) {
            if (! Schema::hasColumn('tax_rates', 'description')) {
                $table->text('description')->nullable()->after('rate_percent');
            }
            if (! Schema::hasColumn('tax_rates', 'is_default')) {
                $table->boolean('is_default')->default(false)->after('active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tax_settings', function (Blueprint $table) {
            $columns = [
                'tax_label',
                'custom_tax_label',
                'tax_calculation_type',
                'tax_rounding_method',
                'show_tax_on_invoice',
                'sales_tax_calculation_type',
                'purchase_tax_calculation_type',
                'allow_sales_tax_override',
                'allow_purchase_tax_override',
                'show_tax_summary_on_bill',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('tax_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('tax_rates', function (Blueprint $table) {
            foreach (['description', 'is_default'] as $column) {
                if (Schema::hasColumn('tax_rates', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
