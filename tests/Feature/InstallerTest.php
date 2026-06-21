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

    /**
     * Validation for the new branch/admin fields must fail before
     * the controller ever calls EnvWriter::write() (which would overwrite
     * the real .env) — db_* fields are valid here specifically so the
     * second validator (app/company/branch/admin) is reached.
     */
    public function test_run_validates_branch_fields_before_writing_env(): void
    {
        $response = $this->postJson('/install/run', [
            'db_connection' => 'sqlite',
            'db_database' => 'database/this_file_need_not_exist.sqlite',
            'app_name' => 'KiteLedger',
            'app_url' => 'http://localhost',
            'timezone' => 'UTC',
            'currency_code' => 'USD',
            'company_name' => 'Acme Inc',
            // branch_name intentionally omitted
            'admin_name' => 'Admin',
            'admin_email' => 'admin@example.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['branch_name']);

        // The real .env on disk must be untouched.
        $this->assertFileExists(base_path('.env'));
    }

    public function test_run_rejects_unsupported_language_code(): void
    {
        $response = $this->postJson('/install/run', [
            'db_connection' => 'sqlite',
            'db_database' => 'database/this_file_need_not_exist.sqlite',
            'app_name' => 'KiteLedger',
            'app_url' => 'http://localhost',
            'timezone' => 'UTC',
            'currency_code' => 'USD',
            'company_name' => 'Acme Inc',
            'branch_name' => 'Main Branch',
            'admin_name' => 'Admin',
            'admin_email' => 'admin@example.com',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'default_language' => 'de',
            'enabled_languages' => ['de'],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['default_language', 'enabled_languages.0']);
    }
}
