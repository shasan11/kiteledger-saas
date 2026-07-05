<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('central_admin_users', function (Blueprint $table): void {
            $table->text('mfa_secret')->nullable();
            $table->text('mfa_recovery_codes')->nullable();
            $table->timestamp('mfa_confirmed_at')->nullable();
        });

        Schema::table('tenants', function (Blueprint $table): void {
            $table->boolean('is_internal')->default(false)->after('status_reason');
            $table->unsignedBigInteger('lifecycle_version')->default(0)->after('is_internal');
        });

        Schema::table('plans', function (Blueprint $table): void {
            $table->unsignedBigInteger('max_api_requests_per_month')->nullable();
            $table->unsignedBigInteger('max_custom_domains')->nullable();
            $table->unsignedBigInteger('max_warehouses')->nullable();
        });

        Schema::table('domains', function (Blueprint $table): void {
            $table->timestamp('verification_attempted_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->foreignId('scheduled_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->timestamp('scheduled_change_at')->nullable();
            $table->timestamp('grace_ends_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('resume_at')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->string('idempotency_key')->nullable()->unique();
            $table->unsignedBigInteger('version')->default(0);
        });

        Schema::table('tenant_invoices', function (Blueprint $table): void {
            $table->json('billing_identity')->nullable();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamp('locked_at')->nullable();
        });

        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->string('idempotency_key')->nullable()->unique();
            $table->decimal('refunded_amount', 14, 2)->default(0);
        });

        $this->createCentralInfrastructure();
        $this->createLifecycleTables();
        $this->createQuotaTables();
        $this->createProvisioningTables();
        $this->createBillingTables();
        $this->createOperationsTables();
        $this->createRbacTables();
    }

    private function createCentralInfrastructure(): void
    {
        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('tenant_id')->nullable()->index();
                $table->foreignId('central_admin_id')->nullable()->index();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
        if (! Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table): void {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
            Schema::create('cache_locks', function (Blueprint $table): void {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
            Schema::create('job_batches', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->integer('failed_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
            Schema::create('failed_jobs', function (Blueprint $table): void {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }
    }

    private function createLifecycleTables(): void
    {
        Schema::create('saas_lifecycle_transitions', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->nullable()->index();
            $table->string('subject_type');
            $table->string('subject_id');
            $table->string('from_state')->nullable();
            $table->string('to_state');
            $table->string('reason_code')->nullable();
            $table->json('context')->nullable();
            $table->foreignId('admin_id')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    private function createQuotaTables(): void
    {
        Schema::create('tenant_usage_counters', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id');
            $table->string('metric');
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedBigInteger('used')->default(0);
            $table->unsignedBigInteger('reserved')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'metric', 'period_start'], 'tenant_metric_period_unique');
        });
        Schema::create('tenant_quota_reservations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('tenant_id');
            $table->string('metric');
            $table->unsignedBigInteger('quantity');
            $table->string('status')->default('reserved');
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
            $table->index(['tenant_id', 'metric', 'status']);
        });
    }

    private function createProvisioningTables(): void
    {
        Schema::create('tenant_database_pool', function (Blueprint $table): void {
            $table->id();
            $table->string('database_name')->unique();
            $table->text('username')->nullable();
            $table->text('password')->nullable();
            $table->string('status')->default('available')->index();
            $table->string('tenant_id')->nullable()->unique();
            $table->timestamp('validated_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });
        Schema::create('tenant_provisioning_attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('status')->default('pending');
            $table->string('current_step')->nullable();
            $table->string('error_code')->nullable();
            $table->text('safe_message')->nullable();
            $table->string('idempotency_key')->unique();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    private function createBillingTables(): void
    {
        Schema::create('tenant_invoice_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invoice_id')->constrained('tenant_invoices')->cascadeOnDelete();
            $table->string('type')->default('plan');
            $table->string('description');
            $table->decimal('quantity', 14, 4)->default(1);
            $table->decimal('unit_amount', 14, 2);
            $table->decimal('amount', 14, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
        Schema::create('billing_credit_notes', function (Blueprint $table): void {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('invoice_id')->constrained('tenant_invoices');
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3);
            $table->text('reason');
            $table->string('status')->default('issued');
            $table->foreignId('created_by')->nullable();
            $table->timestamps();
        });
        Schema::create('payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_transaction_id')->constrained('payment_transactions');
            $table->string('gateway_refund_id')->nullable()->index();
            $table->decimal('amount', 14, 2);
            $table->string('status')->default('pending');
            $table->string('idempotency_key')->unique();
            $table->json('response')->nullable();
            $table->timestamps();
        });
    }

    private function createOperationsTables(): void
    {
        Schema::create('backup_manifests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->nullable()->index();
            $table->string('type');
            $table->string('status')->default('pending');
            $table->string('disk');
            $table->text('path')->nullable();
            $table->string('checksum')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('error_code')->nullable();
            $table->timestamps();
        });
        Schema::create('tenant_deletion_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->index();
            $table->string('status')->default('pending');
            $table->foreignId('requested_by');
            $table->foreignId('approved_by')->nullable();
            $table->timestamp('execute_after');
            $table->foreignUuid('backup_manifest_id')->nullable()->constrained('backup_manifests');
            $table->boolean('backup_waived')->default(false);
            $table->text('reason');
            $table->timestamps();
        });
        Schema::create('saas_heartbeats', function (Blueprint $table): void {
            $table->string('name')->primary();
            $table->timestamp('last_seen_at');
            $table->json('metadata')->nullable();
        });
    }

    private function createRbacTables(): void
    {
        Schema::create('central_roles', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->timestamps();
        });
        Schema::create('central_permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->timestamps();
        });
        Schema::create('central_permission_role', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained('central_roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('central_permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });
        Schema::create('central_admin_role', function (Blueprint $table): void {
            $table->foreignId('admin_id')->constrained('central_admin_users')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('central_roles')->cascadeOnDelete();
            $table->primary(['admin_id', 'role_id']);
        });
        Schema::create('central_impersonation_tokens', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('admin_id')->constrained('central_admin_users')->cascadeOnDelete();
            $table->string('tenant_id');
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['central_impersonation_tokens', 'central_admin_role', 'central_permission_role', 'central_permissions', 'central_roles', 'saas_heartbeats', 'tenant_deletion_requests', 'backup_manifests', 'payment_refunds', 'billing_credit_notes', 'tenant_invoice_lines', 'tenant_provisioning_attempts', 'tenant_database_pool', 'tenant_quota_reservations', 'tenant_usage_counters', 'saas_lifecycle_transitions'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
