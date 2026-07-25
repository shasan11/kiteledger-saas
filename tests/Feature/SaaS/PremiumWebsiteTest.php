<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\WebsiteContentItem;
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
            ->has('page.sections', 11)
            ->has('content.faq', 8)
            ->has('content.testimonial', 3)
            ->has('announcements', 1));

        $this->assertIsArray(Cache::get('website-page:v2:home'));
        $this->assertIsArray(Cache::get('website-content:v1'));
    }

    public function test_content_changes_invalidate_the_public_content_cache(): void
    {
        Cache::put('website-content:v1', ['stale' => true]);
        WebsiteContentItem::create(['type' => 'faq', 'slug' => 'cache-test', 'title' => 'Cache?', 'content' => 'Fresh.', 'status' => 'published']);
        $this->assertNull(Cache::get('website-content:v1'));
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
