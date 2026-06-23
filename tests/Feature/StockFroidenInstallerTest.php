<?php

namespace Tests\Feature;

use App\Support\Installer\InstalledState;
use Tests\TestCase;

/** Stock Froiden installer screens must render on Laravel 13. */
class StockFroidenInstallerTest extends TestCase
{
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

    public function test_stock_froiden_screens_render(): void
    {
        $this->get('/install')->assertOk();              // welcome
        $this->get('/install/environment')->assertOk();  // DB credentials form
        $this->get('/install/requirements')->assertOk();
        $this->get('/install/permissions')->assertOk();
    }
}
