<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AppSettingController;
use App\Models\AppSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
