<?php

namespace App\Services\SaaS;

use App\Models\Central\Tenant;
use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

class TenantFileDeletionService
{
    public function delete(Tenant $tenant): void
    {
        $root = realpath(storage_path());
        if (! $root) {
            throw new \RuntimeException('tenant_files_root_missing');
        }

        $target = $this->tenantRoot($tenant);
        if (! file_exists($target)) {
            return;
        }

        $resolved = realpath($target);
        if (! $resolved || ! $this->isInside($resolved, $root)) {
            throw new \RuntimeException('tenant_files_path_invalid');
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($resolved, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $item) {
            $path = $item->getPathname();
            if ($item->isLink()) {
                $this->unlink($path);

                continue;
            }

            $itemRealPath = $item->getRealPath();
            if (! $itemRealPath || ! $this->isInside($itemRealPath, $resolved)) {
                throw new \RuntimeException('tenant_files_path_invalid');
            }

            $item->isDir() ? $this->removeDirectory($path) : $this->unlink($path);
        }

        $this->removeDirectory($resolved);
    }

    public function tenantRoot(Tenant $tenant): string
    {
        return storage_path(config('tenancy.filesystem.suffix_base', 'tenant').$tenant->getTenantKey());
    }

    private function isInside(string $path, string $root): bool
    {
        $path = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path), DIRECTORY_SEPARATOR);
        $root = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $root), DIRECTORY_SEPARATOR);

        return $path === $root || str_starts_with($path, $root.DIRECTORY_SEPARATOR);
    }

    private function unlink(string $path): void
    {
        if (! @unlink($path)) {
            throw new \RuntimeException('tenant_files_delete_failed');
        }
    }

    private function removeDirectory(string $path): void
    {
        if (! @rmdir($path)) {
            throw new \RuntimeException('tenant_files_delete_failed');
        }
    }
}
