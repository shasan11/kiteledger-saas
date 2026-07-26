<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table): void {
            $table->string('onboarding_idempotency_key')->nullable()->unique();
            $table->string('onboarding_billing_cycle')->nullable();
            $table->string('onboarding_subscription_mode')->nullable();
            $table->timestamp('onboarding_effective_at')->nullable();
            $table->foreignId('database_pool_id')->nullable()->constrained('tenant_database_pool')->nullOnDelete();
            $table->longText('provisioning_owner_password')->nullable();
        });

        Schema::create('tenant_initial_payment_intents', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->unique();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('currency', 3);
            $table->string('payment_method');
            $table->timestamp('payment_date');
            $table->string('reference')->nullable();
            $table->string('bank_reference')->nullable();
            $table->text('notes')->nullable();
            $table->string('proof_disk')->nullable();
            $table->string('proof_path')->nullable();
            $table->boolean('send_receipt')->default(false);
            $table->boolean('adjustment_acknowledged')->default(false);
            $table->string('status')->default('pending')->index();
            $table->string('idempotency_key')->unique();
            $table->foreignId('payment_transaction_id')->nullable()->constrained('payment_transactions')->nullOnDelete();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::table('website_sections', function (Blueprint $table): void {
            $table->foreignId('media_id')->nullable()->constrained('central_media')->nullOnDelete();
            $table->string('image_alt')->nullable();
        });
        Schema::table('website_content_items', function (Blueprint $table): void {
            $table->foreignId('media_id')->nullable()->constrained('central_media')->nullOnDelete();
            $table->string('image_alt')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('website_content_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('media_id');
            $table->dropColumn('image_alt');
        });
        Schema::table('website_sections', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('media_id');
            $table->dropColumn('image_alt');
        });
        Schema::dropIfExists('tenant_initial_payment_intents');
        Schema::table('tenants', function (Blueprint $table): void {
            $table->dropUnique(['onboarding_idempotency_key']);
            $table->dropConstrainedForeignId('database_pool_id');
            $table->dropColumn(['onboarding_idempotency_key', 'onboarding_billing_cycle', 'onboarding_subscription_mode', 'onboarding_effective_at', 'provisioning_owner_password']);
        });
    }
};
