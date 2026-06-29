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
            ->assertJsonPath('logo_url', url('/branding/logo.svg'))
            ->assertJsonPath('dark_logo_url', url('/branding/dark_logo.svg'))
            ->assertJsonPath('favicon_url', url('/branding/favicon.svg'));
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

        $this->assertSame(url('/branding/logo.svg'), $data['logo_url']);
        $this->assertSame(url('/branding/dark_logo.svg'), $data['dark_logo_url']);
        $this->assertSame(url('/branding/favicon.svg'), $data['favicon_url']);
    }
}
