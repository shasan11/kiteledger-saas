<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Installer\InstalledState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstallerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        InstalledState::clear();
    }

    protected function tearDown(): void
    {
        InstalledState::clear();
        parent::tearDown();
    }

    public function test_install_page_is_accessible_when_not_installed(): void
    {
        $this->get('/install')
            ->assertOk()
            ->assertSee('Installer', false);
    }

    public function test_requirements_endpoint_returns_checks(): void
    {
        $response = $this->getJson('/install/requirements')->assertOk();

        $this->assertIsArray($response->json('checks'));
        $this->assertNotEmpty($response->json('checks'));
        // PHP version check is always present.
        $this->assertContains('php', collect($response->json('checks'))->pluck('key')->all());
    }

    public function test_database_test_endpoint_validates_input(): void
    {
        // Missing required db fields → validation error.
        $this->postJson('/install/database', [])->assertStatus(422);
    }

    public function test_installer_is_blocked_once_installed(): void
    {
        // Presence of a user makes the system "installed".
        User::factory()->create();

        $this->get('/install')->assertRedirect('/');
        $this->postJson('/install/run', [])->assertStatus(403);
    }
}
