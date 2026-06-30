<?php

namespace Tests\Unit;

use Tests\TestCase;

class ReportsMenuPermissionContractTest extends TestCase
{
    public function test_reports_menu_honours_the_super_admin_permission_bypass(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Layouts/AuthenticatedLayout/index.jsx');

        $this->assertStringContainsString(
            '].some((permission) => can(permission))',
            $source
        );
        $this->assertStringContainsString(
            '[page.url, permissions, canBypass, t]',
            $source
        );
    }
}
