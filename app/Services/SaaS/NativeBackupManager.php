<?php

namespace App\Services\SaaS;

use App\Contracts\SaaS\BackupManager;
use App\Models\Central\BackupManifest;
use App\Models\Central\Tenant;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class NativeBackupManager implements BackupManager
{
    public function backupTenant(Tenant $tenant): BackupManifest
    {
        $id = (string) Str::uuid();
        $manifest = BackupManifest::create(['id' => $id, 'tenant_id' => $tenant->id, 'type' => 'tenant_database', 'status' => 'running', 'disk' => 'local', 'expires_at' => now()->addDays((int) config('saas.backup_retention_days', 30))]);
        $binary = (new ExecutableFinder)->find('mysqldump');
        if (! $binary) {
            $manifest->update(['status' => 'failed', 'error_code' => 'mysqldump_unavailable']);
            throw new \RuntimeException('mysqldump_unavailable');
        }
        $config = config('database.connections.'.($tenant->database()->getTemplateConnectionName()));
        $directory = storage_path('app/private/backups/'.now()->format('Y-m-d'));
        if (! is_dir($directory)) {
            mkdir($directory, 0770, true);
        }
        $path = $directory.DIRECTORY_SEPARATOR.$id.'.sql';
        $handle = fopen($path.'.tmp', 'wb');
        $process = new Process([$binary, '--single-transaction', '--skip-comments', '--host='.$config['host'], '--port='.(string) $config['port'], '--user='.$config['username'], $tenant->database()->getName()], base_path(), ['MYSQL_PWD' => $config['password'] ?? ''], null, 280);
        $process->run(fn (string $type, string $buffer) => $type === Process::OUT ? fwrite($handle, $buffer) : null);
        fclose($handle);
        if (! $process->isSuccessful()) {
            @unlink($path.'.tmp');
            $manifest->update(['status' => 'failed', 'error_code' => 'database_dump_failed']);
            throw new \RuntimeException('database_dump_failed');
        }
        rename($path.'.tmp', $path);
        $manifest->update(['status' => 'completed', 'path' => $path, 'checksum' => hash_file('sha256', $path), 'size_bytes' => filesize($path)]);
        $this->verify($manifest->fresh());

        return $manifest->fresh();
    }

    public function verify(BackupManifest $manifest): bool
    {
        $valid = $manifest->path && is_file($manifest->path) && hash_equals((string) $manifest->checksum, hash_file('sha256', $manifest->path));
        $manifest->update(['status' => $valid ? 'verified' : 'failed', 'verified_at' => $valid ? now() : null, 'error_code' => $valid ? null : 'checksum_mismatch']);

        return $valid;
    }
}
