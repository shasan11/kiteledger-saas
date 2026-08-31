<?php

namespace Tests\Feature\Ai;

use App\Models\Tenant;
use App\Services\AI\AiReadinessService;
use App\Services\AI\AiSettingsService;
use App\Tenancy\Bootstrappers\PrefixCacheTenancyBootstrapper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * AI settings (provider, API key, model) are platform-wide, stored on the
 * central connection. But the default cache store is repointed to a
 * tenant-suffixed prefix/path the moment tenancy boots (see
 * PrefixCacheTenancyBootstrapper) - so a naive Cache::get/put for the
 * connection-verification flag would only ever be visible from whichever
 * single context (central, or one specific tenant) happened to write it.
 *
 * A superadmin can only run "Test connection" from Central Settings (no
 * tenant active), so without routing that cache access through
 * tenancy()->central(), no tenant would ever see the platform's connection
 * as verified and the Copilot composer would stay disabled everywhere.
 *
 * This needs the real "file" cache driver, not the "array" driver the test
 * suite defaults to: PrefixCacheTenancyBootstrapper forces the cache manager
 * to forget its resolved instances on every bootstrap/revert so the new
 * prefix takes effect, and ArrayStore keeps its data in that discarded
 * instance - so under "array" every bootstrap wipes the cache regardless of
 * this fix, which would make the test pass or fail for the wrong reason.
 */
class AiReadinessCentralCacheTest extends TestCase
{
    use RefreshDatabase;

    private string $cachePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cachePath = storage_path('framework/testing/ai-readiness-cache-'.uniqid());
        config(['cache.default' => 'file', 'cache.stores.file.path' => $this->cachePath]);
        app()->forgetInstance('cache');
        app()->forgetInstance('cache.store');
        Cache::clearResolvedInstances();
    }

    protected function tearDown(): void
    {
        if (tenancy()->initialized) {
            tenancy()->end();
        }

        tenancy()->getBootstrappersUsing = null;

        File::deleteDirectory($this->cachePath);

        parent::tearDown();
    }

    public function test_a_verification_recorded_centrally_is_visible_from_inside_a_tenant(): void
    {
        app(AiSettingsService::class)->setMany(['ai_enabled' => true, 'ai_copilot_enabled' => true, 'ai_provider' => 'openai']);
        app(AiSettingsService::class)->setApiKey('sk-test-key-for-readiness');

        // Recorded exactly like the central "Test connection" action would -
        // no tenant active.
        app(AiReadinessService::class)->recordProviderVerification(true);

        $baseline = app(AiReadinessService::class)->evaluate();
        $this->assertTrue($baseline['provider_connection_verified']);
        $this->assertTrue($baseline['copilot_ready']);

        // Initialize a real tenancy context, scoped to only the cache
        // bootstrapper so this doesn't need a working tenant database,
        // filesystem, or queue connection - just the cache prefix/path
        // change that caused the bug.
        tenancy()->getBootstrappersUsing = fn () => [PrefixCacheTenancyBootstrapper::class];
        tenancy()->initialize(new Tenant(['id' => 'cache-isolation-test-tenant']));

        $fromInsideTenant = app(AiReadinessService::class)->evaluate();

        $this->assertTrue(
            $fromInsideTenant['provider_connection_verified'],
            'The central connection-test result must stay visible from inside a tenant, or the Copilot never becomes usable for any tenant.'
        );
        $this->assertTrue($fromInsideTenant['copilot_ready']);
    }
}
