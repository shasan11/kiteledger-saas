<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_campaigns', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_campaigns', 'description')) {
                $table->text('description')->nullable()->after('medium');
            }
            if (!Schema::hasColumn('crm_campaigns', 'target_customers')) {
                $table->unsignedInteger('target_customers')->nullable()->after('budget');
            }
            if (!Schema::hasColumn('crm_campaigns', 'email_only_quantity')) {
                $table->unsignedInteger('email_only_quantity')->nullable()->after('target_customers');
            }
            if (!Schema::hasColumn('crm_campaigns', 'sms_only_quantity')) {
                $table->unsignedInteger('sms_only_quantity')->nullable()->after('email_only_quantity');
            }
            if (!Schema::hasColumn('crm_campaigns', 'contact_group_id')) {
                $table->foreignUuid('contact_group_id')
                    ->nullable()
                    ->after('sms_only_quantity')
                    ->constrained('contact_groups')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('crm_campaigns', 'email_subject')) {
                $table->string('email_subject', 255)->nullable()->after('contact_group_id');
            }
            if (!Schema::hasColumn('crm_campaigns', 'email_preview_text')) {
                $table->string('email_preview_text', 255)->nullable()->after('email_subject');
            }
            if (!Schema::hasColumn('crm_campaigns', 'email_body')) {
                $table->longText('email_body')->nullable()->after('email_preview_text');
            }
            if (!Schema::hasColumn('crm_campaigns', 'sms_body')) {
                $table->text('sms_body')->nullable()->after('email_body');
            }
            if (!Schema::hasColumn('crm_campaigns', 'rules')) {
                $table->json('rules')->nullable()->after('sms_body');
            }
        });

        if (!Schema::hasTable('sms_configs')) {
            Schema::create('sms_configs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                $table->string('name', 120)->default('Default');
                $table->string('provider', 30); // twilio | infobip
                // Twilio
                $table->string('account_sid', 255)->nullable();
                $table->string('auth_token', 255)->nullable();
                $table->string('from_number', 60)->nullable();
                // Infobip
                $table->string('api_key', 255)->nullable();
                $table->string('base_url', 255)->nullable();
                $table->string('sender_id', 60)->nullable();
                $table->boolean('active')->default(true);
                $table->boolean('is_default')->default(false);
                $table->boolean('is_system_generated')->default(false);
                $table->foreignId('user_add_id')->nullable()->constrained('users');
                $table->timestamps();

                $table->index(['provider', 'active']);
                $table->index('is_default');
            });
        }

        if (!Schema::hasTable('campaign_send_logs')) {
            Schema::create('campaign_send_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('campaign_id')->constrained('crm_campaigns')->cascadeOnDelete();
                $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
                $table->string('channel', 10); // email | sms
                $table->string('to_address', 191)->nullable(); // email or phone
                $table->string('status', 20)->default('queued'); // queued|sent|failed|skipped
                $table->string('provider_message_id', 191)->nullable();
                $table->text('error')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->foreignId('user_add_id')->nullable()->constrained('users');
                $table->timestamps();

                $table->index(['campaign_id', 'channel', 'status']);
                $table->index(['contact_id', 'channel']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_send_logs');
        Schema::dropIfExists('sms_configs');

        Schema::table('crm_campaigns', function (Blueprint $table) {
            foreach ([
                'rules',
                'sms_body',
                'email_body',
                'email_preview_text',
                'email_subject',
                'contact_group_id',
                'sms_only_quantity',
                'email_only_quantity',
                'target_customers',
                'description',
            ] as $col) {
                if (Schema::hasColumn('crm_campaigns', $col)) {
                    try {
                        if ($col === 'contact_group_id') {
                            $table->dropForeign(['contact_group_id']);
                        }
                    } catch (\Throwable) {}
                    $table->dropColumn($col);
                }
            }
        });
    }
};
