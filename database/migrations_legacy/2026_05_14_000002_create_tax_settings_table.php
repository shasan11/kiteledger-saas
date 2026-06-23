<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('branch_id')->nullable()->index();

            // Tax Registration
            $table->boolean('is_tax_registered')->default(false);
            $table->string('registration_type', 30)->nullable();
            $table->string('tax_number', 80)->nullable();
            $table->string('tax_registered_name', 180)->nullable();
            $table->string('country_code', 3)->nullable()->default('NP');
            $table->string('default_currency', 10)->nullable()->default('NPR');
            $table->date('registration_effective_date')->nullable();

            // Sales Tax
            $table->boolean('sales_tax_enabled')->default(false);
            $table->string('sales_tax_name', 80)->nullable()->default('VAT');
            $table->decimal('sales_tax_rate_percent', 8, 4)->nullable()->default(0);
            $table->uuid('default_sales_tax_rate_id')->nullable()->index();
            $table->unsignedBigInteger('sales_tax_account_id')->nullable();
            $table->unsignedBigInteger('sales_tax_payable_account_id')->nullable();

            // Purchase Tax
            $table->boolean('purchase_tax_enabled')->default(false);
            $table->string('purchase_tax_name', 80)->nullable()->default('VAT');
            $table->decimal('purchase_tax_rate_percent', 8, 4)->nullable()->default(0);
            $table->uuid('default_purchase_tax_rate_id')->nullable()->index();
            $table->boolean('purchase_tax_recoverable')->default(true);
            $table->unsignedBigInteger('purchase_tax_account_id')->nullable();

            // Product Behavior
            $table->enum('product_tax_behavior', ['all_same', 'some_exempt', 'some_different'])
                ->default('all_same');

            // Meta
            $table->boolean('advanced_mode')->default(false);
            $table->string('preset', 30)->nullable()->default('none');
            $table->boolean('wizard_completed')->default(false);
            $table->unsignedBigInteger('user_add_id')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_settings');
    }
};
