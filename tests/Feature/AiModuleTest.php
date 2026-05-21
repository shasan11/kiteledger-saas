<?php

namespace Tests\Feature;

use App\Models\AiSetting;
use App\Services\AI\AiActionGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_is_disabled_by_default(): void
    {
        $settings = AiSetting::current();

        $this->assertFalse($settings->enabled);
    }

    public function test_ai_module_disabled_by_default(): void
    {
        $settings = AiSetting::current();

        $this->assertFalse($settings->isModuleEnabled('global_command'));
        $this->assertFalse($settings->isModuleEnabled('transaction_review'));
        $this->assertFalse($settings->isModuleEnabled('invoice_assistant'));
    }

    public function test_api_key_is_encrypted_and_masked(): void
    {
        $settings = AiSetting::current();
        $settings->setApiKeyRawAttribute('sk-testkey1234abcd');
        $settings->save();

        $fresh = AiSetting::find($settings->id);

        // Full key never returned as plain text attribute
        $this->assertArrayNotHasKey('api_key', $fresh->toArray());
        $this->assertArrayNotHasKey('api_key_encrypted', $fresh->toArray());

        // Decryption works
        $this->assertEquals('sk-testkey1234abcd', $fresh->getDecryptedApiKey());

        // Masking works
        $masked = $fresh->getMaskedApiKey();
        $this->assertStringNotContainsString('testkey', $masked);
        $this->assertStringContainsString('****', $masked);
    }

    public function test_ai_settings_endpoint_returns_403_without_permission(): void
    {
        $response = $this->getJson('/api/ai/settings');

        // Unauthenticated → 401 or redirect
        $this->assertContains($response->status(), [401, 403, 302]);
    }

    public function test_ai_action_guard_blocks_unsafe_actions(): void
    {
        $guard = new AiActionGuard();

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        $guard->assertSafeAction('approve');
    }

    public function test_ai_action_guard_allows_safe_actions(): void
    {
        $guard = new AiActionGuard();

        $this->assertTrue($guard->assertSafeAction('explain'));
        $this->assertTrue($guard->assertSafeAction('summarize'));
    }

    public function test_ai_action_guard_sanitizes_context(): void
    {
        $guard = new AiActionGuard();

        $dirty = [
            'name'     => 'Test User',
            'password' => 'secret123',
            'email'    => 'test@example.com',
            'api_key'  => 'sk-1234',
        ];

        $clean = $guard->sanitizeContext($dirty);

        $this->assertArrayHasKey('name', $clean);
        $this->assertArrayHasKey('email', $clean);
        $this->assertArrayNotHasKey('password', $clean);
        $this->assertArrayNotHasKey('api_key', $clean);
    }

    public function test_ai_setting_can_enable_and_disable_modules(): void
    {
        $settings = AiSetting::current();
        $settings->enabled = true;
        $settings->enabled_modules = [
            'global_command'     => true,
            'transaction_review' => false,
        ];
        $settings->save();

        $fresh = AiSetting::find($settings->id);

        $this->assertTrue($fresh->isModuleEnabled('global_command'));
        $this->assertFalse($fresh->isModuleEnabled('transaction_review'));

        // Reset
        $settings->enabled = false;
        $settings->enabled_modules = config('ai.default_modules_enabled');
        $settings->save();
    }
}
