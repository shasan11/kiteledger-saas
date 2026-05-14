<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->string('account_no', 40)->nullable()->unique();
            $table->string('name', 180);
            $table->string('legal_name', 180)->nullable();
            $table->string('industry', 120)->nullable();
            $table->string('website', 180)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            $table->foreignUuid('parent_account_id')->nullable()->constrained('crm_accounts');
            $table->foreignId('owner_id')->nullable()->constrained('users');
            $table->enum('status', ['active', 'inactive', 'prospect', 'customer', 'churned'])->default('prospect');
            $table->string('segment', 80)->nullable();
            $table->string('source', 80)->nullable();
            $table->decimal('annual_revenue', 18, 2)->nullable();
            $table->unsignedInteger('employee_count')->nullable();
            $table->decimal('credit_limit', 18, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['owner_id', 'status']);
            $table->index(['name', 'email']);
        });

        Schema::table('contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('contacts', 'crm_account_id')) {
                $table->uuid('crm_account_id')->nullable()->after('account_id');
                $table->index('crm_account_id');
            }
        });

        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'crm_account_id')) {
                $table->uuid('crm_account_id')->nullable()->after('contact_id');
            }
            if (!Schema::hasColumn('leads', 'lost_reason')) {
                $table->string('lost_reason', 255)->nullable()->after('status');
            }
            $table->index(['crm_account_id', 'status']);
            $table->index(['assigned_to_id', 'next_follow_up_date']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('deals', function (Blueprint $table) {
            if (!Schema::hasColumn('deals', 'crm_account_id')) {
                $table->uuid('crm_account_id')->nullable()->after('contact_id');
            }
            if (!Schema::hasColumn('deals', 'committed')) {
                $table->boolean('committed')->default(false)->after('probability');
            }
            $table->index(['crm_account_id', 'status']);
            $table->index(['assigned_to_id', 'status']);
            $table->index(['deal_stage_id', 'updated_at']);
            $table->index(['expected_close_date', 'status']);
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_activities', 'crm_account_id')) {
                $table->uuid('crm_account_id')->nullable()->after('contact_id');
            }
            if (!Schema::hasColumn('crm_activities', 'escalated_at')) {
                $table->dateTime('escalated_at')->nullable()->after('reminder_at');
                $table->unsignedBigInteger('escalated_to')->nullable()->after('escalated_at');
                $table->string('escalation_reason', 255)->nullable()->after('escalated_to');
            }
            $table->index(['crm_account_id', 'status']);
            $table->index(['assigned_to_id', 'due_at', 'status']);
        });

        Schema::table('quotations', function (Blueprint $table) {
            if (!Schema::hasColumn('quotations', 'deal_id')) {
                $table->uuid('deal_id')->nullable()->after('contact_id');
                $table->index('deal_id');
            }
        });

        Schema::create('crm_contact_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->constrained('crm_accounts');
            $table->foreignUuid('contact_id')->constrained();
            $table->foreignUuid('deal_id')->nullable()->constrained();
            $table->enum('role', ['decision_maker', 'influencer', 'finance_contact', 'technical_contact', 'end_user', 'gatekeeper', 'other'])->default('other');
            $table->boolean('is_primary')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'role']);
            $table->index(['deal_id', 'role']);
        });

        Schema::create('crm_deal_stage_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('deal_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('from_stage_id')->nullable()->constrained('deal_stages');
            $table->foreignUuid('to_stage_id')->nullable()->constrained('deal_stages');
            $table->foreignId('changed_by')->nullable()->constrained('users');
            $table->dateTime('changed_at');
            $table->unsignedInteger('days_in_previous_stage')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['deal_id', 'changed_at']);
            $table->index(['to_stage_id', 'changed_at']);
        });

        Schema::create('crm_activity_escalations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('activity_id')->constrained('crm_activities')->cascadeOnDelete();
            $table->foreignId('escalated_to')->nullable()->constrained('users');
            $table->foreignId('escalated_by')->nullable()->constrained('users');
            $table->dateTime('escalated_at');
            $table->string('reason', 255);
            $table->enum('status', ['open', 'acknowledged', 'resolved'])->default('open');
            $table->timestamps();

            $table->index(['status', 'escalated_at']);
        });

        Schema::create('crm_communications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->foreignUuid('account_id')->nullable()->constrained('crm_accounts');
            $table->foreignUuid('contact_id')->nullable()->constrained();
            $table->foreignUuid('lead_id')->nullable()->constrained();
            $table->foreignUuid('deal_id')->nullable()->constrained();
            $table->enum('type', ['email', 'whatsapp', 'sms', 'call', 'meeting', 'note'])->default('note');
            $table->enum('direction', ['inbound', 'outbound', 'internal'])->default('internal');
            $table->string('subject', 180)->nullable();
            $table->text('body')->nullable();
            $table->string('external_message_id', 180)->nullable();
            $table->string('from', 180)->nullable();
            $table->string('to', 500)->nullable();
            $table->string('cc', 500)->nullable();
            $table->enum('sentiment', ['positive', 'neutral', 'negative'])->nullable();
            $table->dateTime('communication_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['account_id', 'communication_date']);
            $table->index(['contact_id', 'communication_date']);
            $table->index(['lead_id', 'communication_date']);
            $table->index(['deal_id', 'communication_date']);
        });

        Schema::create('crm_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->string('name', 180);
            $table->string('code', 60)->nullable()->unique();
            $table->string('source', 80)->nullable();
            $table->string('medium', 80)->nullable();
            $table->decimal('budget', 18, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'paused', 'completed', 'cancelled'])->default('draft');
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['source', 'medium']);
        });

        Schema::create('crm_attributions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->nullable()->constrained('crm_campaigns')->nullOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 80)->nullable();
            $table->string('medium', 80)->nullable();
            $table->decimal('value', 18, 2)->nullable();
            $table->decimal('revenue', 18, 2)->nullable();
            $table->decimal('cost', 18, 2)->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'source']);
            $table->index(['lead_id', 'deal_id']);
        });

        Schema::create('crm_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('notable_type');
            $table->uuid('notable_id');
            $table->text('note');
            $table->enum('visibility', ['internal', 'customer_visible'])->default('internal');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['notable_type', 'notable_id']);
        });

        Schema::create('crm_sequences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->nullable()->constrained();
            $table->string('name', 180);
            $table->text('description')->nullable();
            $table->enum('target_type', ['lead', 'deal', 'customer'])->default('lead');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['branch_id', 'target_type', 'active']);
        });

        Schema::create('crm_sequence_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sequence_id')->constrained('crm_sequences')->cascadeOnDelete();
            $table->unsignedInteger('step_order')->default(1);
            $table->enum('action_type', ['call', 'email', 'whatsapp', 'task', 'meeting'])->default('task');
            $table->unsignedInteger('delay_days')->default(0);
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->text('template')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['sequence_id', 'step_order']);
        });

        Schema::create('crm_customer_health_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->nullable()->constrained('crm_accounts')->cascadeOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(50);
            $table->enum('status', ['healthy', 'neutral', 'at_risk', 'churn_risk'])->default('neutral');
            $table->text('reason')->nullable();
            $table->string('last_payment_status', 80)->nullable();
            $table->unsignedInteger('open_invoice_count')->default(0);
            $table->decimal('overdue_invoice_amount', 18, 2)->default(0);
            $table->unsignedInteger('open_activity_count')->default(0);
            $table->dateTime('last_interaction_at')->nullable();
            $table->dateTime('calculated_at')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'status']);
            $table->index(['contact_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_customer_health_scores');
        Schema::dropIfExists('crm_sequence_steps');
        Schema::dropIfExists('crm_sequences');
        Schema::dropIfExists('crm_notes');
        Schema::dropIfExists('crm_attributions');
        Schema::dropIfExists('crm_campaigns');
        Schema::dropIfExists('crm_communications');
        Schema::dropIfExists('crm_activity_escalations');
        Schema::dropIfExists('crm_deal_stage_histories');
        Schema::dropIfExists('crm_contact_roles');

        Schema::table('quotations', function (Blueprint $table) {
            if (Schema::hasColumn('quotations', 'deal_id')) {
                $table->dropIndex(['deal_id']);
                $table->dropColumn('deal_id');
            }
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->dropIndex(['assigned_to_id', 'due_at', 'status']);
            if (Schema::hasColumn('crm_activities', 'crm_account_id')) {
                $table->dropIndex(['crm_account_id', 'status']);
                $table->dropColumn('crm_account_id');
            }
            if (Schema::hasColumn('crm_activities', 'escalated_to')) {
                $table->dropColumn('escalated_to');
            }
            foreach (['escalated_at', 'escalation_reason'] as $column) {
                if (Schema::hasColumn('crm_activities', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->dropIndex(['assigned_to_id', 'status']);
            $table->dropIndex(['deal_stage_id', 'updated_at']);
            $table->dropIndex(['expected_close_date', 'status']);
            if (Schema::hasColumn('deals', 'crm_account_id')) {
                $table->dropIndex(['crm_account_id', 'status']);
                $table->dropColumn('crm_account_id');
            }
            if (Schema::hasColumn('deals', 'committed')) {
                $table->dropColumn('committed');
            }
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['assigned_to_id', 'next_follow_up_date']);
            $table->dropIndex(['status', 'created_at']);
            if (Schema::hasColumn('leads', 'crm_account_id')) {
                $table->dropIndex(['crm_account_id', 'status']);
                $table->dropColumn('crm_account_id');
            }
            if (Schema::hasColumn('leads', 'lost_reason')) {
                $table->dropColumn('lost_reason');
            }
        });

        Schema::table('contacts', function (Blueprint $table) {
            if (Schema::hasColumn('contacts', 'crm_account_id')) {
                $table->dropIndex(['crm_account_id']);
                $table->dropColumn('crm_account_id');
            }
        });

        Schema::dropIfExists('crm_accounts');
    }
};
