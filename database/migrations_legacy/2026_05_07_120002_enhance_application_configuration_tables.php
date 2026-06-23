<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('app_settings', 'legal_name')) {
                $table->string('legal_name', 180)->nullable()->after('company_name');
                $table->string('registration_number', 80)->nullable()->after('legal_name');
                $table->string('tax_number', 80)->nullable()->after('registration_number');
                $table->string('vat_number', 80)->nullable()->after('tax_number');
                $table->string('address_line_1', 255)->nullable()->after('website');
                $table->string('address_line_2', 255)->nullable()->after('address_line_1');
                $table->string('city', 80)->nullable()->after('address_line_2');
                $table->string('state', 80)->nullable()->after('city');
                $table->string('postal_code', 40)->nullable()->after('state');
                $table->string('country', 80)->nullable()->after('postal_code');
                $table->foreignUuid('default_currency_id')->nullable()->after('country')->constrained('currencies')->nullOnDelete();
                $table->foreignUuid('fiscal_year_id')->nullable()->after('default_currency_id')->constrained('fiscal_years')->nullOnDelete();
                $table->string('timezone', 80)->default('Asia/Katmandu')->after('fiscal_year_id');
                $table->string('date_format', 30)->default('DD-MM-YYYY')->after('timezone');
                $table->string('time_format', 30)->default('HH:mm')->after('date_format');
                $table->string('number_format', 40)->nullable()->after('time_format');
                $table->string('language', 20)->default('en')->after('number_format');
                $table->string('week_start_day', 20)->default('Sunday')->after('language');
                $table->unsignedTinyInteger('financial_year_start_month')->default(4)->after('week_start_day');
                $table->boolean('use_nepali_calendar')->default(false)->after('financial_year_start_month');
            }
        });

        Schema::table('email_configs', function (Blueprint $table) {
            if (!Schema::hasColumn('email_configs', 'branch_id')) {
                $table->foreignUuid('branch_id')->nullable()->after('id')->constrained('branches')->nullOnDelete();
                $table->string('mailer', 40)->default('smtp')->after('email_config_name');
                $table->string('encryption', 20)->nullable()->after('email_port');
                $table->string('from_name', 120)->nullable()->after('email_pass');
                $table->string('from_address', 180)->nullable()->after('from_name');
            }
        });

        Schema::table('currencies', function (Blueprint $table) {
            if (!Schema::hasColumn('currencies', 'exchange_rate')) {
                $table->decimal('exchange_rate', 18, 6)->default(1)->after('decimal_places');
            }
        });
    }

    public function down(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            if (Schema::hasColumn('currencies', 'exchange_rate')) {
                $table->dropColumn('exchange_rate');
            }
        });

        Schema::table('email_configs', function (Blueprint $table) {
            if (Schema::hasColumn('email_configs', 'branch_id')) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
                $table->dropColumn(['mailer', 'encryption', 'from_name', 'from_address']);
            }
        });

        Schema::table('app_settings', function (Blueprint $table) {
            foreach (['default_currency_id', 'fiscal_year_id'] as $column) {
                if (Schema::hasColumn('app_settings', $column)) {
                    $table->dropForeign([$column]);
                }
            }

            $columns = [
                'legal_name', 'registration_number', 'tax_number', 'vat_number',
                'address_line_1', 'address_line_2', 'city', 'state', 'postal_code',
                'country', 'default_currency_id', 'fiscal_year_id', 'timezone',
                'date_format', 'time_format', 'number_format', 'language',
                'week_start_day', 'financial_year_start_month', 'use_nepali_calendar',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('app_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
