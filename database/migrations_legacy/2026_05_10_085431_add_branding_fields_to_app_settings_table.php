<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('app_settings', 'dark_logo')) {
                $table->string('dark_logo')->nullable()->after('logo');
            }

            if (!Schema::hasColumn('app_settings', 'favicon')) {
                $table->string('favicon')->nullable()->after('dark_logo');
            }

            if (!Schema::hasColumn('app_settings', 'brand_primary_color')) {
                $table->string('brand_primary_color', 20)->nullable()->after('favicon');
            }

            if (!Schema::hasColumn('app_settings', 'brand_secondary_color')) {
                $table->string('brand_secondary_color', 20)->nullable()->after('brand_primary_color');
            }

            if (!Schema::hasColumn('app_settings', 'brand_accent_color')) {
                $table->string('brand_accent_color', 20)->nullable()->after('brand_secondary_color');
            }

            if (!Schema::hasColumn('app_settings', 'brand_sidebar_color')) {
                $table->string('brand_sidebar_color', 20)->nullable()->after('brand_accent_color');
            }

            if (!Schema::hasColumn('app_settings', 'brand_header_color')) {
                $table->string('brand_header_color', 20)->nullable()->after('brand_sidebar_color');
            }

            if (!Schema::hasColumn('app_settings', 'brand_text_color')) {
                $table->string('brand_text_color', 20)->nullable()->after('brand_header_color');
            }
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'dark_logo',
                'favicon',
                'brand_primary_color',
                'brand_secondary_color',
                'brand_accent_color',
                'brand_sidebar_color',
                'brand_header_color',
                'brand_text_color',
            ]);
        });
    }
};