<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProductionAssetSafetyTest extends TestCase
{
    public function test_remote_host_never_uses_stale_local_vite_hot_server(): void
    {
        $hotFile = public_path('hot');
        file_put_contents($hotFile, 'http://[::1]:5173');

        try {
            $response = $this->get('https://central.test/admin/login');

            $response->assertOk();
            $response->assertDontSee('[::1]:5173', false);
            $response->assertDontSee('@vite/client', false);
            $response->assertSee('/build/assets/', false);
        } finally {
            @unlink($hotFile);
        }
    }
}
