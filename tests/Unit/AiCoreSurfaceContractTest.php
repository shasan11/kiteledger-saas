<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AiCoreSurfaceContractTest extends TestCase
{
    public function test_product_registers_the_kiteledger_copilot_surface(): void
    {
        $root = dirname(__DIR__, 2);
        $tenantRoutes = file_get_contents($root.'/routes/tenant.php');
        $apiRoutes = file_get_contents($root.'/routes/api.php');
        $layout = file_get_contents($root.'/resources/js/Layouts/AuthenticatedLayout/index.jsx');
        $app = file_get_contents($root.'/resources/js/app.jsx');

        $this->assertStringContainsString("'/ai/assistant'", $tenantRoutes);
        $this->assertStringContainsString("Route::post('chat'", $apiRoutes);
        $this->assertStringContainsString("Route::get('conversations'", $apiRoutes);
        $this->assertStringContainsString("label: 'KiteLedger Copilot'", $layout);
        $this->assertStringNotContainsString("'!./Pages/App/AI/**'", $app);
    }
}
