<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\Currency;
use App\Models\Language;
use App\Models\User;
use App\Support\Installer\InstalledState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exercises the full /install/run flow end-to-end (the one path the
 * standard InstallerTest deliberately avoids, since it writes a real
 * .env). Runs against the RefreshDatabase test connection so it's safe
 * here, and asserts ProductionSeeder + the new branch/language/admin
 * wiring actually produce a working installation with no demo data or
 * backdoor accounts.
 */
class InstallerFullRunTest extends TestCase
{
    use RefreshDatabase;

    private ?string $envBackup = null;

    protected function setUp(): void
    {
        parent::setUp();
        InstalledState::clear();

        // /install/run calls EnvWriter::write(), which overwrites the real
        // .env on disk no matter what DB the test itself runs against.
        // Snapshot it so tearDown can restore it unconditionally.
        $envPath = base_path('.env');
        $this->envBackup = is_file($envPath) ? file_get_contents($envPath) : null;
    }

    protected function tearDown(): void
    {
        if ($this->envBackup !== null) {
            file_put_contents(base_path('.env'), $this->envBackup);
        }

        InstalledState::clear();
        parent::tearDown();
    }

    public function test_full_install_run_creates_branch_admin_and_languages_without_demo_data(): void
    {
        $dbConfig = config('database.connections.'.config('database.default'));

        $payload = [
            'db_connection' => 'sqlite',
            'db_host' => $dbConfig['host'] ?? '127.0.0.1',
            'db_port' => $dbConfig['port'] ?? '3306',
            'db_database' => $dbConfig['database'] ?? ':memory:',
            'db_username' => $dbConfig['username'] ?? '',
            'db_password' => $dbConfig['password'] ?? '',
            'app_name' => 'KiteLedger Test',
            'app_url' => 'http://kiteledger.test',
            'timezone' => 'UTC',
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'company_name' => 'Acme Inc',
            'company_email' => 'hello@acme.test',
            'company_phone' => '555-0100',
            'branch_name' => 'Head Quarters',
            'branch_code' => 'HQ',
            'admin_name' => 'Site Admin',
            'admin_email' => 'owner@acme.test',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
            'default_language' => 'es',
            'enabled_languages' => ['es', 'fr'],
        ];

        // In-memory sqlite can't be reconnected mid-request the way the
        // controller's configureRuntimeDatabase() expects for file-based
        // DBs, so this test only applies when the suite runs against a
        // real sqlite file or mysql connection.
        if (($dbConfig['database'] ?? null) === ':memory:') {
            $this->markTestSkipped('Requires a file-based or networked test database, not :memory: sqlite.');
        }

        $response = $this->postJson('/install/setup/run', $payload);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertTrue(InstalledState::isInstalled());

        $branch = Branch::query()->where('code', 'HQ')->first();
        $this->assertNotNull($branch);
        $this->assertSame('Head Quarters', $branch->name);
        $this->assertTrue((bool) $branch->is_head_office);

        $admin = User::query()->where('email', 'owner@acme.test')->first();
        $this->assertNotNull($admin);
        $this->assertSame($branch->id, $admin->branch_id);
        $this->assertSame('en', $admin->locale);
        $this->assertTrue($admin->hasRole('Super Admin'));

        $default = Language::query()->where('is_default', true)->first();
        $this->assertNotNull($default);
        $this->assertSame('en', $default->code);
        $this->assertTrue(Language::query()->where('code', 'en')->value('is_active'));
        $this->assertTrue(Language::query()->where('code', 'es')->value('is_active'));
        $this->assertTrue(Language::query()->where('code', 'fr')->value('is_active'));
        $this->assertSame('en', $branch->fresh()->language?->code);
        $this->assertSame(['en', 'es', 'fr'], $branch->fresh()->enabled_languages);

        // No demo/backdoor accounts from the excluded seeders.
        $this->assertNull(User::query()->where('email', 'admin@kiteledger.test')->first());
        $this->assertSame(1, User::query()->count(), 'Only the real admin created by the installer should exist.');

        // Company name the user entered must win over the seeded demo rows, and
        // there must be exactly ONE settings row (the seeders create two).
        $this->assertSame(1, AppSetting::query()->count(), 'Duplicate app_settings rows must be collapsed to one.');
        $settings = AppSetting::query()->orderBy('created_at')->first();
        $this->assertSame('Acme Inc', $settings->company_name);
        $this->assertNull($settings->tax_number, 'Demo identity fields must be cleared.');

        // Exactly one base currency = the chosen one, rate 1, and it is the
        // company default currency.
        $base = Currency::query()->where('is_base', true)->get();
        $this->assertCount(1, $base, 'There must be exactly one base currency.');
        $this->assertSame('USD', $base->first()->code);
        $this->assertEquals(1.0, (float) $base->first()->exchange_rate);
        $this->assertSame($base->first()->id, $settings->default_currency_id);

        // The admin can authenticate with the credentials entered in the form.
        $admin = User::query()->where('email', 'owner@acme.test')->first();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password123', $admin->password));
    }
}
