<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\ContactLocation;
use App\Models\Central\ResourceArticle;
use App\Models\Central\WebsiteFeature;
use App\Models\Central\WebsiteMenu;
use App\Support\PhoneNumber;
use Database\Seeders\WebsiteSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class WebsiteCentralUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_website_seeder_is_idempotent_and_creates_the_six_page_navigation(): void
    {
        $this->seed(WebsiteSeeder::class);
        $counts = [WebsiteFeature::count(), ResourceArticle::count(), ContactLocation::count()];
        $this->seed(WebsiteSeeder::class);

        $this->assertSame($counts, [WebsiteFeature::count(), ResourceArticle::count(), ContactLocation::count()]);
        $this->assertSame(
            ['Home', 'Features', 'Pricing', 'Blogs', 'Resources', 'Contact'],
            WebsiteMenu::where('location', 'header')->where('is_active', true)->orderBy('sort_order')->pluck('label')->all()
        );
        $this->assertGreaterThanOrEqual(3, ResourceArticle::count());
    }

    public function test_phone_numbers_are_normalized_to_one_e164_value(): void
    {
        $this->assertSame('+9779812345678', PhoneNumber::join('+977', '981-234-5678'));
        $this->assertSame('+447700900123', PhoneNumber::join('+1', '+44 7700 900123'));
        $this->assertSame('+977', PhoneNumber::callingCode('NP'));
    }

    public function test_superadmin_mfa_routes_are_available(): void
    {
        $this->assertTrue(Route::has('central.mfa.challenge'));
        $this->assertTrue(Route::has('central.mfa.verify'));
        $this->assertTrue(Route::has('central.profile.mfa.setup'));
        $this->assertTrue(Route::has('central.profile.mfa.confirm'));
        $this->assertTrue(Route::has('central.profile.mfa.disable'));
    }
}
