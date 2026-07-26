<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AppSettingController;
use App\Models\AppSetting;
use App\Models\Central\CentralAdmin;
use App\Models\Central\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use ReflectionMethod;
use Tests\TestCase;

class BrandingFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_brand_endpoint_returns_shipped_assets_without_settings(): void
    {
        $this->getJson('/api/brand')
            ->assertOk()
            ->assertJsonPath('logo_url', url('/branding/light_logo.png'))
            ->assertJsonPath('dark_logo_url', url('/branding/dark_logo.png'))
            ->assertJsonPath('favicon_url', url('/branding/favicon.png'));
    }

    public function test_missing_uploaded_paths_fall_back_in_serialized_settings(): void
    {
        $setting = AppSetting::query()->create([
            'company_name' => 'Fallback Test',
            'logo' => 'company/logos/missing.png',
            'dark_logo' => 'company/logos/missing-dark.png',
            'favicon' => 'company/favicons/missing.png',
        ]);

        $method = new ReflectionMethod(AppSettingController::class, 'serializeAppSetting');
        $data = $method->invoke(new AppSettingController, $setting);

        $this->assertSame(url('/branding/light_logo.png'), $data['logo_url']);
        $this->assertSame(url('/branding/dark_logo.png'), $data['dark_logo_url']);
        $this->assertSame(url('/branding/favicon.png'), $data['favicon_url']);
    }

    public function test_platform_branding_logo_upload_persists_and_feeds_public_branding(): void
    {
        Storage::fake('public');

        $admin = CentralAdmin::create([
            'name' => 'Owner',
            'email' => 'owner-branding@example.test',
            'password' => bcrypt('correct-password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);
        PlatformSetting::create([
            'group' => 'branding',
            'key' => 'branding.light_logo',
            'label' => 'Light logo',
            'type' => 'string',
            'input_type' => 'image',
            'value' => '',
            'is_public' => true,
        ]);

        $this->actingAs($admin, 'central')
            ->post(route('central.settings.update', 'branding'), [
                '_method' => 'put',
                'values' => [
                    'branding.light_logo' => UploadedFile::fake()->image('logo.png', 120, 60),
                ],
            ])
            ->assertRedirect();

        $saved = PlatformSetting::where('key', 'branding.light_logo')->firstOrFail()->value;

        $this->assertStringStartsWith('/storage/central/settings/', $saved);
        Storage::disk('public')->assertExists(str($saved)->after('/storage/')->toString());
        $this->assertSame($saved, app(AppSettingController::class)->brand()->getData(true)['logo_url']);
    }
}
