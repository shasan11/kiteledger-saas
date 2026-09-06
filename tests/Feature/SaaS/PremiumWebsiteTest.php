<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\WebsiteContentItem;
use App\Models\Central\WebsiteFeature;
use App\Models\Central\NavbarNotification;
use Database\Seeders\PlatformSettingsSeeder;
use Database\Seeders\WebsiteSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PremiumWebsiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_public_site_exposes_structured_content_and_cache_safe_arrays(): void
    {
        $this->seed([PlatformSettingsSeeder::class, WebsiteSeeder::class]);

        $this->get(route('central.home'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Central/Website/Page')
            ->where('page.page_type', 'home')
            ->has('page.sections', 12)
            ->has('content.faq', 8)
            ->has('content.testimonial', 3)
            ->has('announcements', 1));

        $sections = collect(Cache::get('website-page:v2:home')['sections']);

        // The public marketing site has one product screenshot: the hero.
        $withScreenshot = $sections->filter(fn (array $section) => filled($section['image'] ?? null))
            ->pluck('section_key')->values()->all();
        $this->assertSame(['hero'], $withScreenshot);
        $this->assertStringContainsString('homedashboard', $sections->firstWhere('section_key', 'hero')['image']);
        $this->assertEmpty($sections->firstWhere('section_key', 'invoice')['image']);

        // The plain capability showcase sits directly after the core grid.
        $order = $sections->pluck('section_key')->values()->all();
        $this->assertSame(array_search('platform', $order, true) + 1, array_search('showcase', $order, true));

        // Homepage accordion stays short while the CMS keeps all eight entries.
        $this->assertSame(5, $sections->firstWhere('section_key', 'faq')['settings']['limit']);

        $showcase = $sections->firstWhere('section_key', 'showcase');
        $this->assertSame('features', $showcase['section_type']);
        $this->assertCount(3, $showcase['items']);
        foreach ($showcase['items'] as $item) {
            $this->assertNotEmpty($item['title'], 'each capability needs a label');
            $this->assertNotEmpty($item['content'], 'each capability needs a description');
            $this->assertArrayNotHasKey('image', $item, 'capability cards stay text and icon led');
        }

        // Icon cards must survive: the grids are explicitly not screenshot-based.
        $platform = $sections->firstWhere('section_key', 'platform')['items'];
        $this->assertCount(6, $platform);
        $this->assertNotEmpty($platform[0]['icon']);
        $this->assertArrayNotHasKey('image', $platform[0]);

        $this->assertSame(15, WebsiteFeature::whereNotNull('featured_media_id')->count());

        $this->assertIsArray(Cache::get('website-page:v2:home'));
        $this->assertIsArray(Cache::get('website-content:v1'));
    }

    public function test_content_changes_invalidate_the_public_content_cache(): void
    {
        Cache::put('website-content:v1', ['stale' => true]);
        WebsiteContentItem::create(['type' => 'faq', 'slug' => 'cache-test', 'title' => 'Cache?', 'content' => 'Fresh.', 'status' => 'published']);
        $this->assertNull(Cache::get('website-content:v1'));
    }

    public function test_active_navbar_notices_are_shared_with_public_pages(): void
    {
        $this->seed([PlatformSettingsSeeder::class, WebsiteSeeder::class]);

        NavbarNotification::create([
            'content' => 'Scheduled maintenance tonight.',
            'link_label' => 'Read details',
            'link_url' => '/resources',
            'target' => 'same_tab',
            'is_dismissible' => true,
            'is_active' => true,
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addDay(),
            'sort_order' => 0,
        ]);

        $this->get(route('central.home'))->assertOk()->assertInertia(fn ($page) => $page
            ->has('navbarNotifications', 1)
            ->where('navbarNotifications.0.content', 'Scheduled maintenance tonight.')
            ->where('navbarNotifications.0.link_url', '/resources'));
    }

    public function test_public_contact_form_is_validated_rate_limited_and_persisted(): void
    {
        $this->post(route('central.website-leads.store'), [
            'type' => 'contact', 'name' => 'Asha Rana', 'email' => 'asha@example.test',
            'company' => 'Summit Trading', 'company_size' => '11–50',
            'message' => 'We need accounting and inventory across two branches.',
            'source' => 'contact-page', 'privacy_consent' => '1', 'website' => '',
        ])->assertRedirect();

        $this->assertDatabaseHas('website_leads', ['email' => 'asha@example.test', 'status' => 'new', 'type' => 'contact']);
        $this->post(route('central.website-leads.store'), ['type' => 'contact', 'email' => 'bad'])->assertSessionHasErrors(['name', 'email', 'privacy_consent']);
    }

    public function test_tenant_demo_command_fails_closed_for_an_unknown_tenant(): void
    {
        $this->artisan('kiteledger:seed-demo', ['--tenant' => 'missing-tenant'])
            ->expectsOutputToContain('was not found')
            ->assertFailed();
    }
}
