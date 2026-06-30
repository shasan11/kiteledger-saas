<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AiCoreSurfaceContractTest extends TestCase
{
    public function test_core_product_does_not_register_the_general_ai_assistant(): void
    {
        $root = dirname(__DIR__, 2);
        $webRoutes = file_get_contents($root.'/routes/web.php');
        $apiRoutes = file_get_contents($root.'/routes/api.php');
        $layout = file_get_contents($root.'/resources/js/Layouts/AuthenticatedLayout/index.jsx');
        $app = file_get_contents($root.'/resources/js/app.jsx');

        $this->assertStringNotContainsString("'/ai/assistant'", $webRoutes);
        $this->assertStringNotContainsString("Route::post('chat'", $apiRoutes);
        $this->assertStringNotContainsString("Route::get('conversations'", $apiRoutes);
        $this->assertStringNotContainsString("label: 'AI Assistant'", $layout);
        $this->assertStringContainsString("'!./Pages/App/AI/**'", $app);
    }
}
