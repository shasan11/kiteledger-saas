<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $this->widenCampaignStatus();

        Schema::table('crm_campaigns', function (Blueprint $table) {
            $this->addColumnIfMissing($table, 'type', fn () => $table->string('type', 30)->default('email_sms')->after('code'));
            $this->addColumnIfMissing($table, 'default_sender_name', fn () => $table->string('default_sender_name', 180)->nullable()->after('description'));
            $this->addColumnIfMissing($table, 'default_sender_email', fn () => $table->string('default_sender_email', 180)->nullable()->after('default_sender_name'));
            $this->addColumnIfMissing($table, 'default_reply_to_email', fn () => $table->string('default_reply_to_email', 180)->nullable()->after('default_sender_email'));
            $this->addColumnIfMissing($table, 'default_sms_sender_id', fn () => $table->string('default_sms_sender_id', 60)->nullable()->after('default_reply_to_email'));
            $this->addColumnIfMissing($table, 'priority', fn () => $table->string('priority', 30)->default('normal')->after('status'));
            $this->addColumnIfMissing($table, 'tags', fn () => $table->json('tags')->nullable()->after('priority'));
            $this->addColumnIfMissing($table, 'internal_remarks', fn () => $table->text('internal_remarks')->nullable()->after('tags'));
            $this->addColumnIfMissing($table, 'created_by', fn () => $table->foreignId('created_by')->nullable()->after('internal_remarks')->constrained('users')->nullOnDelete());
            $this->addColumnIfMissing($table, 'updated_by', fn () => $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete());
            $this->addColumnIfMissing($table, 'sent_at', fn () => $table->dateTime('sent_at')->nullable()->after('updated_by'));
            $this->addColumnIfMissing($table, 'completed_at', fn () => $table->dateTime('completed_at')->nullable()->after('sent_at'));
            $this->addColumnIfMissing($table, 'cancelled_at', fn () => $table->dateTime('cancelled_at')->nullable()->after('completed_at'));
        });

        $this->createMessageTables();
        $this->extendSendLogs();
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_sms_recipients');
        Schema::dropIfExists('campaign_email_recipients');
        Schema::dropIfExists('campaign_email_attachments');
        Schema::dropIfExists('campaign_sms_messages');
        Schema::dropIfExists('campaign_email_messages');
    }

    private function createMessageTables(): void
    {
        if (!Schema::hasTable('campaign_email_messages')) {
            Schema::create('campaign_email_messages', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->string('title', 180);
                $table->string('code', 80)->nullable();
                $table->string('subject', 255)->nullable();
                $table->string('preview_text', 255)->nullable();
                $table->string('sender_name', 180)->nullable();
                $table->string('sender_email', 180)->nullable();
                $table->string('reply_to_email', 180)->nullable();
                $table->longText('body')->nullable();
                $table->foreignUuid('template_id')->nullable();
                $table->string('status', 30)->default('draft');
                $table->string('send_mode', 30)->default('draft');
                $table->dateTime('scheduled_at')->nullable();
                $table->string('timezone', 80)->nullable();
                $table->unsignedInteger('delay_minutes')->nullable();
                $table->unsignedInteger('send_order')->default(1);
                $table->boolean('is_active')->default(true);
                $table->boolean('track_opens')->default(true);
                $table->boolean('track_clicks')->default(true);
                $table->string('priority', 30)->default('normal');
                $table->text('notes')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->dateTime('completed_at')->nullable();
                $table->dateTime('cancelled_at')->nullable();
                $table->timestamps();

                $table->unique(['campaign_id', 'code']);
                $table->index(['campaign_id', 'status', 'scheduled_at']);
            });
        }

        if (!Schema::hasTable('campaign_email_attachments')) {
            Schema::create('campaign_email_attachments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->foreignUuid('campaign_email_message_id')->constrained('campaign_email_messages')->cascadeOnDelete();
                $table->string('original_name', 255);
                $table->string('file_name', 255);
                $table->string('file_path', 500);
                $table->string('file_type', 80)->nullable();
                $table->string('mime_type', 120)->nullable();
                $table->unsignedBigInteger('file_size')->default(0);
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['campaign_id', 'campaign_email_message_id', 'is_active'], 'campaign_email_attachments_message_active_idx');
            });
        }

        if (!Schema::hasTable('campaign_sms_messages')) {
            Schema::create('campaign_sms_messages', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->string('title', 180);
                $table->string('code', 80)->nullable();
                $table->string('sender_id', 60)->nullable();
                $table->text('body')->nullable();
                $table->unsignedInteger('character_count')->default(0);
                $table->unsignedInteger('segment_count')->default(0);
                $table->string('status', 30)->default('draft');
                $table->string('send_mode', 30)->default('draft');
                $table->dateTime('scheduled_at')->nullable();
                $table->string('timezone', 80)->nullable();
                $table->unsignedInteger('delay_minutes')->nullable();
                $table->unsignedInteger('send_order')->default(1);
                $table->boolean('is_active')->default(true);
                $table->string('priority', 30)->default('normal');
                $table->text('notes')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->dateTime('completed_at')->nullable();
                $table->dateTime('cancelled_at')->nullable();
                $table->timestamps();

                $table->unique(['campaign_id', 'code']);
                $table->index(['campaign_id', 'status', 'scheduled_at']);
            });
        }

        if (!Schema::hasTable('campaign_email_recipients')) {
            Schema::create('campaign_email_recipients', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->foreignUuid('campaign_email_message_id')->constrained('campaign_email_messages')->cascadeOnDelete();
                $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
                $table->foreignUuid('contact_group_id')->nullable()->constrained('contact_groups')->nullOnDelete();
                $table->string('name', 180)->nullable();
                $table->string('company_name', 180)->nullable();
                $table->string('email', 180);
                $table->string('phone', 80)->nullable();
                $table->string('source', 40)->default('manual');
                $table->boolean('is_valid_email')->default(true);
                $table->boolean('is_unsubscribed')->default(false);
                $table->string('status', 30)->default('ready');
                $table->dateTime('scheduled_at')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->string('last_log_status', 30)->nullable();
                $table->timestamps();

                $table->unique(['campaign_email_message_id', 'email'], 'campaign_email_recipients_unique_email');
                $table->index(['campaign_id', 'status', 'source']);
            });
        }

        if (!Schema::hasTable('campaign_sms_recipients')) {
            Schema::create('campaign_sms_recipients', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->foreignUuid('campaign_sms_message_id')->constrained('campaign_sms_messages')->cascadeOnDelete();
                $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
                $table->foreignUuid('contact_group_id')->nullable()->constrained('contact_groups')->nullOnDelete();
                $table->string('name', 180)->nullable();
                $table->string('company_name', 180)->nullable();
                $table->string('email', 180)->nullable();
                $table->string('phone', 80);
                $table->string('source', 40)->default('manual');
                $table->boolean('is_valid_phone')->default(true);
                $table->boolean('is_unsubscribed')->default(false);
                $table->string('status', 30)->default('ready');
                $table->dateTime('scheduled_at')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->string('last_log_status', 30)->nullable();
                $table->timestamps();

                $table->unique(['campaign_sms_message_id', 'phone'], 'campaign_sms_recipients_unique_phone');
                $table->index(['campaign_id', 'status', 'source']);
            });
        }
    }

    private function extendSendLogs(): void
    {
        if (!Schema::hasTable('campaign_send_logs')) {
            return;
        }

        Schema::table('campaign_send_logs', function (Blueprint $table) {
            $this->addColumnIfMissing($table, 'campaign_email_message_id', fn () => $table->foreignUuid('campaign_email_message_id')->nullable()->after('campaign_id')->constrained('campaign_email_messages')->nullOnDelete());
            $this->addColumnIfMissing($table, 'campaign_sms_message_id', fn () => $table->foreignUuid('campaign_sms_message_id')->nullable()->after('campaign_email_message_id')->constrained('campaign_sms_messages')->nullOnDelete());
            $this->addColumnIfMissing($table, 'campaign_email_recipient_id', fn () => $table->foreignUuid('campaign_email_recipient_id')->nullable()->after('campaign_sms_message_id')->constrained('campaign_email_recipients')->nullOnDelete());
            $this->addColumnIfMissing($table, 'campaign_sms_recipient_id', fn () => $table->foreignUuid('campaign_sms_recipient_id')->nullable()->after('campaign_email_recipient_id')->constrained('campaign_sms_recipients')->nullOnDelete());
            $this->addColumnIfMissing($table, 'contact_group_id', fn () => $table->foreignUuid('contact_group_id')->nullable()->after('contact_id')->constrained('contact_groups')->nullOnDelete());
            $this->addColumnIfMissing($table, 'type', fn () => $table->string('type', 10)->nullable()->after('channel'));
            $this->addColumnIfMissing($table, 'message_title', fn () => $table->string('message_title', 180)->nullable()->after('type'));
            $this->addColumnIfMissing($table, 'recipient_name', fn () => $table->string('recipient_name', 180)->nullable()->after('message_title'));
            $this->addColumnIfMissing($table, 'company_name', fn () => $table->string('company_name', 180)->nullable()->after('recipient_name'));
            $this->addColumnIfMissing($table, 'email', fn () => $table->string('email', 180)->nullable()->after('company_name'));
            $this->addColumnIfMissing($table, 'phone', fn () => $table->string('phone', 80)->nullable()->after('email'));
            $this->addColumnIfMissing($table, 'provider', fn () => $table->string('provider', 80)->nullable()->after('phone'));
            $this->addColumnIfMissing($table, 'external_message_id', fn () => $table->string('external_message_id', 191)->nullable()->after('provider_message_id'));
            $this->addColumnIfMissing($table, 'error_code', fn () => $table->string('error_code', 80)->nullable()->after('external_message_id'));
            $this->addColumnIfMissing($table, 'error_message', fn () => $table->text('error_message')->nullable()->after('error_code'));
            $this->addColumnIfMissing($table, 'provider_response', fn () => $table->json('provider_response')->nullable()->after('error_message'));
            $this->addColumnIfMissing($table, 'metadata', fn () => $table->json('metadata')->nullable()->after('provider_response'));
            $this->addColumnIfMissing($table, 'queued_at', fn () => $table->dateTime('queued_at')->nullable()->after('metadata'));
            $this->addColumnIfMissing($table, 'delivered_at', fn () => $table->dateTime('delivered_at')->nullable()->after('sent_at'));
            $this->addColumnIfMissing($table, 'opened_at', fn () => $table->dateTime('opened_at')->nullable()->after('delivered_at'));
            $this->addColumnIfMissing($table, 'clicked_at', fn () => $table->dateTime('clicked_at')->nullable()->after('opened_at'));
            $this->addColumnIfMissing($table, 'failed_at', fn () => $table->dateTime('failed_at')->nullable()->after('clicked_at'));
            $this->addColumnIfMissing($table, 'bounced_at', fn () => $table->dateTime('bounced_at')->nullable()->after('failed_at'));
            $this->addColumnIfMissing($table, 'skipped_at', fn () => $table->dateTime('skipped_at')->nullable()->after('bounced_at'));
            $this->addColumnIfMissing($table, 'resolved_at', fn () => $table->dateTime('resolved_at')->nullable()->after('skipped_at'));
        });
    }

    private function widenCampaignStatus(): void
    {
        if (!Schema::hasTable('crm_campaigns') || !Schema::hasColumn('crm_campaigns', 'status')) {
            return;
        }

        try {
            $driver = Schema::getConnection()->getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE crm_campaigns MODIFY status VARCHAR(40) NOT NULL DEFAULT 'draft'");
            } elseif ($driver === 'pgsql') {
                DB::statement("ALTER TABLE crm_campaigns ALTER COLUMN status TYPE VARCHAR(40)");
                DB::statement("ALTER TABLE crm_campaigns ALTER COLUMN status SET DEFAULT 'draft'");
            }
        } catch (Throwable) {
            // Existing SQLite/test schemas already treat enum as a string.
        }
    }

    private function addColumnIfMissing(Blueprint $table, string $column, callable $callback): void
    {
        if (!Schema::hasColumn($table->getTable(), $column)) {
            $callback();
        }
    }
};
