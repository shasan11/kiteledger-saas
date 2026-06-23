<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('sms_configs')) {
            Schema::create('sms_configs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
                $table->string('name', 120);
                $table->string('provider', 40);
                $table->timestamps();
            });
        }

        Schema::table('sms_configs', function (Blueprint $table) {
            $this->addColumnIfMissing($table, 'sender_id', fn () => $table->string('sender_id', 60)->nullable());
            $this->addColumnIfMissing($table, 'api_base_url', fn () => $table->string('api_base_url', 500)->nullable());
            $this->addColumnIfMissing($table, 'base_url', fn () => $table->string('base_url', 500)->nullable());
            $this->addColumnIfMissing($table, 'api_key', fn () => $table->text('api_key')->nullable());
            $this->addColumnIfMissing($table, 'api_secret', fn () => $table->text('api_secret')->nullable());
            $this->addColumnIfMissing($table, 'account_sid', fn () => $table->string('account_sid', 255)->nullable());
            $this->addColumnIfMissing($table, 'username', fn () => $table->string('username', 255)->nullable());
            $this->addColumnIfMissing($table, 'password', fn () => $table->text('password')->nullable());
            $this->addColumnIfMissing($table, 'auth_token', fn () => $table->text('auth_token')->nullable());
            $this->addColumnIfMissing($table, 'from_number', fn () => $table->string('from_number', 80)->nullable());
            $this->addColumnIfMissing($table, 'route', fn () => $table->string('route', 80)->nullable());
            $this->addColumnIfMissing($table, 'country_code', fn () => $table->string('country_code', 12)->nullable());
            $this->addColumnIfMissing($table, 'default_country_code', fn () => $table->string('default_country_code', 12)->nullable());
            $this->addColumnIfMissing($table, 'webhook_url', fn () => $table->string('webhook_url', 500)->nullable());
            $this->addColumnIfMissing($table, 'callback_url', fn () => $table->string('callback_url', 500)->nullable());
            $this->addColumnIfMissing($table, 'active', fn () => $table->boolean('active')->default(true));
            $this->addColumnIfMissing($table, 'is_active', fn () => $table->boolean('is_active')->default(true));
            $this->addColumnIfMissing($table, 'is_default', fn () => $table->boolean('is_default')->default(false));
            $this->addColumnIfMissing($table, 'test_phone', fn () => $table->string('test_phone', 80)->nullable());
            $this->addColumnIfMissing($table, 'test_message', fn () => $table->text('test_message')->nullable());
            $this->addColumnIfMissing($table, 'metadata', fn () => $table->json('metadata')->nullable());
            $this->addColumnIfMissing($table, 'created_by', fn () => $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete());
            $this->addColumnIfMissing($table, 'updated_by', fn () => $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete());
            $this->addColumnIfMissing($table, 'user_add_id', fn () => $table->foreignId('user_add_id')->nullable()->constrained('users')->nullOnDelete());
            $this->addColumnIfMissing($table, 'is_system_generated', fn () => $table->boolean('is_system_generated')->default(false));
        });

        if (!Schema::hasTable('sms_templates')) {
            Schema::create('sms_templates', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name', 160);
                $table->string('code', 120)->unique();
                $table->string('module', 80)->nullable();
                $table->string('subject', 180)->nullable();
                $table->string('internal_title', 180)->nullable();
                $table->text('body');
                $table->json('variables')->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('active')->default(true);
                $table->boolean('is_system_generated')->default(false);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['module', 'is_active']);
            });
        }

        if (!Schema::hasTable('sms_logs')) {
            Schema::create('sms_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('sms_config_id')->nullable()->constrained('sms_configs')->nullOnDelete();
                $table->foreignUuid('sms_template_id')->nullable()->constrained('sms_templates')->nullOnDelete();
                $table->foreignUuid('campaign_id')->nullable()->constrained('crm_campaigns')->nullOnDelete();
                $table->foreignUuid('campaign_sms_message_id')->nullable()->constrained('campaign_sms_messages')->nullOnDelete();
                $table->foreignUuid('campaign_sms_recipient_id')->nullable()->constrained('campaign_sms_recipients')->nullOnDelete();
                $table->string('module', 80)->nullable();
                $table->string('module_id', 80)->nullable();
                $table->string('recipient_name', 180)->nullable();
                $table->string('phone', 80);
                $table->string('normalized_phone', 80)->nullable();
                $table->string('sender_id', 80)->nullable();
                $table->string('provider', 80)->nullable();
                $table->text('message');
                $table->unsignedInteger('message_length')->default(0);
                $table->unsignedInteger('segment_count')->default(1);
                $table->string('status', 30)->default('pending');
                $table->string('provider_message_id', 191)->nullable();
                $table->json('provider_response')->nullable();
                $table->string('error_code', 80)->nullable();
                $table->text('error_message')->nullable();
                $table->dateTime('queued_at')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->dateTime('delivered_at')->nullable();
                $table->dateTime('failed_at')->nullable();
                $table->dateTime('bounced_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['provider', 'status', 'created_at']);
                $table->index(['campaign_id', 'campaign_sms_message_id']);
                $table->index('normalized_phone');
            });
        }

        if (Schema::hasTable('campaign_send_logs')) {
            Schema::table('campaign_send_logs', function (Blueprint $table) {
                $this->addColumnIfMissing($table, 'sms_log_id', fn () => $table->foreignUuid('sms_log_id')->nullable()->after('campaign_sms_recipient_id')->constrained('sms_logs')->nullOnDelete());
            });
        }

        if (Schema::hasTable('campaign_sms_messages')) {
            Schema::table('campaign_sms_messages', function (Blueprint $table) {
                $this->addColumnIfMissing($table, 'sms_config_id', fn () => $table->foreignUuid('sms_config_id')->nullable()->after('sender_id')->constrained('sms_configs')->nullOnDelete());
                $this->addColumnIfMissing($table, 'provider_override', fn () => $table->string('provider_override', 40)->nullable()->after('sms_config_id'));
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('campaign_send_logs') && Schema::hasColumn('campaign_send_logs', 'sms_log_id')) {
            Schema::table('campaign_send_logs', function (Blueprint $table) {
                try {
                    $table->dropForeign(['sms_log_id']);
                } catch (Throwable) {
                }
                $table->dropColumn('sms_log_id');
            });
        }

        if (Schema::hasTable('campaign_sms_messages')) {
            Schema::table('campaign_sms_messages', function (Blueprint $table) {
                foreach (['sms_config_id', 'provider_override'] as $column) {
                    if (Schema::hasColumn('campaign_sms_messages', $column)) {
                        if ($column === 'sms_config_id') {
                            try {
                                $table->dropForeign(['sms_config_id']);
                            } catch (Throwable) {
                            }
                        }
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('sms_templates');
    }

    private function addColumnIfMissing(Blueprint $table, string $column, callable $callback): void
    {
        if (!Schema::hasColumn($table->getTable(), $column)) {
            $callback();
        }
    }
};
