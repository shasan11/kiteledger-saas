<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\Media;
use App\Models\Central\PlatformSetting;
use App\Models\Central\PlatformSettingRevision;
use App\Models\Central\Subscription;
use App\Models\Central\WebsitePage;
use App\Models\Central\WebsiteSection;
use App\Services\SaaS\PlatformSettingsService;
use Database\Seeders\PlatformSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PlatformSettingsSubscriptionMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_reject_unknown_cross_group_and_read_only_keys_with_field_errors(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $service = app(PlatformSettingsService::class);

        foreach ([
            ['general', ['missing.key' => 'x'], 'values.missing.key'],
            ['general', ['branding.primary_color' => '#000000'], 'values.branding.primary_color'],
        ] as [$group, $values, $field]) {
            try {
                $service->updateSection($group, $values);
                $this->fail('A validation exception was expected.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey($field, $exception->errors());
            }
        }

        $setting = PlatformSetting::where('key', 'general.platform_name')->firstOrFail();
        $setting->update(['is_readonly' => true]);
        try {
            $service->updateSection('general', [$setting->key => 'Changed']);
            $this->fail('A validation exception was expected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('values.'.$setting->key, $exception->errors());
        }
    }

    public function test_settings_only_revision_changes_and_never_revision_secret_values(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $service = app(PlatformSettingsService::class);
        $name = PlatformSetting::where('key', 'general.platform_name')->firstOrFail();

        $unchanged = $service->updateSection('general', [$name->key => $name->value]);
        $this->assertSame([], $unchanged['saved']);
        $this->assertSame([$name->key], $unchanged['unchanged']);
        $this->assertDatabaseCount('platform_setting_revisions', 0);

        $secret = PlatformSetting::where('key', 'email.password')->firstOrFail();
        $service->updateSection('email', [$secret->key => 'not-a-plaintext-revision']);
        $revision = PlatformSettingRevision::where('setting_id', $secret->id)->firstOrFail();
        $this->assertNull($revision->getRawOriginal('old_value'));
        $this->assertNull($revision->getRawOriginal('new_value'));
        $this->assertStringNotContainsString('not-a-plaintext-revision', (string) $secret->fresh()->getRawOriginal('value'));

        $before = PlatformSettingRevision::count();
        $service->updateSection('email', [$secret->key => '']);
        $this->assertSame($before, PlatformSettingRevision::count());
    }

    public function test_group_and_public_setting_caches_are_invalidated_after_commit(): void
    {
        $this->seed(PlatformSettingsSeeder::class);
        $service = app(PlatformSettingsService::class);
        $key = 'branding.primary_color';
        $service->get($key);
        $service->getGroup('branding');
        $service->publicSettings();

        $service->updateSection('branding', [$key => '#123456']);

        $this->assertSame('#123456', $service->getGroup('branding')[$key]);
        $this->assertSame('#123456', $service->publicSettings()[$key]);
        $this->assertFalse(Cache::has('platform-setting:'.$key));
    }

    public function test_subscription_validity_fails_closed_for_missing_or_expired_dates(): void
    {
        $base = ['starts_at' => now()->subDay(), 'ends_at' => null];

        $this->assertFalse((new Subscription(['status' => 'active', 'current_period_ends_at' => now()->addDay()]))->isValid());
        $this->assertFalse((new Subscription($base + ['status' => 'active', 'current_period_ends_at' => now()->subSecond()]))->isValid());
        $this->assertTrue((new Subscription($base + ['status' => 'active', 'current_period_ends_at' => now()->addDay()]))->isValid());
        $this->assertFalse((new Subscription($base + ['status' => 'trialing', 'trial_ends_at' => now()->subSecond()]))->isValid());
        $this->assertTrue((new Subscription($base + ['status' => 'trialing', 'trial_ends_at' => now()->addDay()]))->isValid());
        $this->assertFalse((new Subscription($base + ['status' => 'past_due', 'current_period_ends_at' => now()->addDay()]))->isValid());
    }

    public function test_section_media_relationship_exposes_safe_metadata_without_storage_path(): void
    {
        $page = WebsitePage::create(['title' => 'Media', 'slug' => 'media-test', 'page_type' => 'landing', 'layout' => 'default', 'status' => 'draft', 'visibility' => 'public']);
        $media = Media::create(['disk' => 'public', 'path' => 'central/media/screenshot.png', 'original_filename' => 'screenshot.png', 'mime_type' => 'image/png', 'size' => 100, 'width' => 1200, 'height' => 700]);
        $section = WebsiteSection::create(['page_id' => $page->id, 'section_key' => 'hero', 'section_type' => 'hero', 'alignment' => 'left', 'is_active' => true, 'sort_order' => 0, 'media_id' => $media->id, 'image_alt' => 'Product dashboard']);

        $serialized = $section->load('media')->toArray()['media'];
        $this->assertSame($media->id, $serialized['id']);
        $this->assertArrayHasKey('url', $serialized);
        $this->assertArrayNotHasKey('path', $serialized);
        $this->assertArrayNotHasKey('disk', $serialized);
    }
}
