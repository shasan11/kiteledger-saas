<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Global online payment settings (singleton)
        Schema::create('online_payment_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->boolean('enable_online_payment')->default(false);
            $table->boolean('allow_public_invoice_payment')->default(false);
            $table->boolean('allow_partial_invoice_payment')->default(false);
            $table->boolean('allow_invoice_overpayment')->default(false);
            $table->decimal('minimum_partial_payment_amount', 15, 2)->nullable();
            $table->unsignedInteger('payment_link_expiry_days')->nullable();
            $table->string('default_gateway', 40)->nullable();
            $table->boolean('receipt_email_enabled')->default(true);
            $table->boolean('webhook_logging_enabled')->default(true);
            $table->boolean('enable_google_login')->default(false);
            $table->string('google_client_id', 255)->nullable();
            $table->text('google_client_secret_encrypted')->nullable();
            $table->string('google_redirect_uri', 500)->nullable();
            $table->string('google_allowed_domains', 500)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Per-provider gateway credentials/config
        Schema::create('payment_gateway_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider', 40)->unique();
            $table->boolean('enabled')->default(false);
            $table->string('mode', 20)->default('test'); // test | live | sandbox
            $table->string('display_name', 100)->nullable();
            $table->json('public_config')->nullable(); // safe config for frontend
            $table->text('encrypted_credentials')->nullable(); // Crypt::encryptString(json)
            $table->json('allowed_currencies')->nullable();
            $table->string('default_currency', 10)->nullable();
            $table->boolean('webhook_enabled')->default(true);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Public shareable token per invoice
        Schema::create('invoice_payment_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('public_token', 64)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamps();

            $table->index('public_token');
            $table->index('invoice_id');
        });

        // One record per payment attempt
        Schema::create('online_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignUuid('customer_payment_id')->nullable()->constrained('customer_payments')->nullOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->string('provider', 40);
            $table->string('provider_payment_id', 255)->nullable();
            $table->string('provider_order_id', 255)->nullable();
            $table->string('provider_session_id', 255)->nullable();
            $table->string('public_token', 64)->nullable()->index();
            $table->decimal('amount', 15, 2);
            $table->foreignUuid('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->string('currency_code', 10)->default('USD');
            $table->decimal('exchange_rate', 20, 6)->default(1);
            $table->string('status', 30)->default('pending');
            // pending | processing | succeeded | failed | cancelled | refunded | partially_refunded
            $table->string('payment_method', 60)->nullable();
            $table->decimal('gateway_fee', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2)->nullable();
            $table->string('customer_name', 200)->nullable();
            $table->string('customer_email', 200)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->json('raw_request')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->text('failed_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['provider', 'provider_payment_id'], 'op_provider_payment_unique');
            $table->index(['provider', 'provider_order_id']);
            $table->index('status');
        });

        // Raw webhook event logs
        Schema::create('payment_webhook_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider', 40);
            $table->string('event_id', 255)->nullable()->index();
            $table->string('event_type', 100)->nullable();
            $table->json('payload');
            $table->json('headers')->nullable();
            $table->boolean('verified')->default(false);
            $table->boolean('processed')->default(false);
            $table->text('processing_error')->nullable();
            $table->foreignUuid('online_payment_id')->nullable()->constrained('online_payments')->nullOnDelete();
            $table->timestamp('received_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['provider', 'event_id']);
            $table->index('processed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_logs');
        Schema::dropIfExists('online_payments');
        Schema::dropIfExists('invoice_payment_links');
        Schema::dropIfExists('payment_gateway_settings');
        Schema::dropIfExists('online_payment_settings');
    }
};
