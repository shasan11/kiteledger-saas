<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\Tenant;
use App\Services\SaaS\TenantFileDeletionService;
use Tests\TestCase;

class TenantFileDeletionServiceTest extends TestCase
{
    private array $paths = [];

    protected function tearDown(): void
    {
        foreach (array_reverse($this->paths) as $path) {
            $this->removePath($path);
        }

        parent::tearDown();
    }

    public function test_it_deletes_only_the_normalized_tenant_storage_root(): void
    {
        $tenant = new Tenant(['id' => 'file-safe']);
        $service = app(TenantFileDeletionService::class);
        $tenantRoot = $service->tenantRoot($tenant);
        $sibling = storage_path('tenantfile-safe-sibling');
        $this->paths = [$tenantRoot, $sibling];
        mkdir($tenantRoot.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'public', 0775, true);
        mkdir($sibling, 0775, true);
        file_put_contents($tenantRoot.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'document.txt', 'tenant');
        file_put_contents($tenantRoot.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'avatar.txt', 'public');
        file_put_contents($sibling.DIRECTORY_SEPARATOR.'keep.txt', 'central');

        $service->delete($tenant);

        $this->assertDirectoryDoesNotExist($tenantRoot);
        $this->assertFileExists($sibling.DIRECTORY_SEPARATOR.'keep.txt');
    }

    public function test_it_refuses_to_delete_a_resolved_path_outside_storage(): void
    {
        config(['tenancy.filesystem.suffix_base' => 'tenant-delete-test']);
        $outside = base_path('tenant-delete-outside');
        $tenantPrefix = storage_path('tenant-delete-test');
        $this->paths = [$outside, $tenantPrefix];
        mkdir($outside, 0775, true);
        mkdir($tenantPrefix, 0775, true);
        file_put_contents($outside.DIRECTORY_SEPARATOR.'keep.txt', 'outside');
        $tenant = new Tenant(['id' => DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'..'.DIRECTORY_SEPARATOR.'tenant-delete-outside']);

        $this->expectExceptionMessage('tenant_files_path_invalid');

        try {
            app(TenantFileDeletionService::class)->delete($tenant);
        } finally {
            $this->assertFileExists($outside.DIRECTORY_SEPARATOR.'keep.txt');
        }
    }

    private function removePath(string $path): void
    {
        if (! file_exists($path) && ! is_link($path)) {
            return;
        }
        if (is_file($path) || is_link($path)) {
            @unlink($path);

            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iterator as $item) {
            $item->isDir() && ! $item->isLink() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }
        @rmdir($path);
    }
}
