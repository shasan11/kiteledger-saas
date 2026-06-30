<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ReportUiContractTest extends TestCase
{
    public function test_shared_report_page_has_safe_hooks_and_export_permissions(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/Reports/Shared/ReportPage.jsx');

        $this->assertStringContainsString('useCallback, useEffect', $source);
        $this->assertStringContainsString("permissions.includes('reports.export')", $source);
        $this->assertStringNotContainsString("permissions.includes('reports.export') || permissions.includes('reports.view')", $source);
        $this->assertStringContainsString('Failed to load report.', $source);
        $this->assertStringContainsString('hasGenerated', $source);
    }
}
