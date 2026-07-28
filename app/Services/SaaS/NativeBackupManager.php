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
        $configured=(string)app(PlatformSettingsService::class)->get('backups.mysqldump_path','');
        $binary=$configured&&is_file($configured)?$configured:(new ExecutableFinder)->find('mysqldump');
        if(!$binary){foreach(['C:\\xampp\\mysql\\bin\\mysqldump.exe','C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe','/usr/bin/mysqldump','/usr/local/bin/mysqldump'] as $candidate)if(is_file($candidate)){$binary=$candidate;break;}}
        if (! $binary) {
            $manifest->update(['status' => 'failed', 'error_code' => 'mysqldump_unavailable']);
            app(CentralNotificationService::class)->notifyOnce('backup_failed', 'infrastructure', 'critical', 'Tenant backup failed', $tenant->company_name.' could not be backed up: mysqldump unavailable.', route('central.backups.index'), $manifest, [], 1);
            throw new \RuntimeException('Database backup tool is not available. Configure the mysqldump path under Settings → Backups or install MySQL client tools.');
        }
        $config = config('database.connections.'.($tenant->database()->getTemplateConnectionName()));
        $directory = storage_path('app/private/backups/'.now()->format('Y-m-d'));
        if (! is_dir($directory) && ! @mkdir($directory, 0770, true) && ! is_dir($directory)) {$manifest->update(['status'=>'failed','error_code'=>'backup_directory_unwritable']);throw new \RuntimeException('The private backup directory could not be created. Check storage permissions.');}
        if (! is_writable($directory)) {$manifest->update(['status'=>'failed','error_code'=>'backup_directory_unwritable']);throw new \RuntimeException('The private backup directory is not writable. Check storage permissions.');}
        $path = $directory.DIRECTORY_SEPARATOR.$id.'.sql';
        $handle = @fopen($path.'.tmp', 'wb');
        if(!$handle){$manifest->update(['status'=>'failed','error_code'=>'backup_file_unwritable']);throw new \RuntimeException('The temporary backup file could not be opened for writing.');}
        $process = new Process([$binary, '--single-transaction', '--skip-comments', '--host='.$config['host'], '--port='.(string) $config['port'], '--user='.$config['username'], $tenant->database()->getName()], base_path(), ['MYSQL_PWD' => $config['password'] ?? ''], null, 280);
        $process->run(fn (string $type, string $buffer) => $type === Process::OUT ? fwrite($handle, $buffer) : null);
        fclose($handle);
        if (! $process->isSuccessful()) {
            @unlink($path.'.tmp');
            $manifest->update(['status' => 'failed', 'error_code' => 'database_dump_failed']);
            app(CentralNotificationService::class)->notifyOnce('backup_failed', 'infrastructure', 'critical', 'Tenant backup failed', $tenant->company_name.' database dump failed.', route('central.backups.index'), $manifest, [], 1);
            throw new \RuntimeException($process->isTimedOut()?'The database backup timed out. Increase the backup timeout or check database connectivity.':'The database dump failed. Verify the database credentials, privileges, and mysqldump compatibility.');
        }
        if(!@rename($path.'.tmp', $path)){@unlink($path.'.tmp');$manifest->update(['status'=>'failed','error_code'=>'backup_finalize_failed']);throw new \RuntimeException('The completed backup could not be finalized on disk.');}
        if(filesize($path)===0){@unlink($path);$manifest->update(['status'=>'failed','error_code'=>'empty_backup']);throw new \RuntimeException('The database backup completed without producing data.');}
        $manifest->update(['status' => 'completed', 'path' => $path, 'checksum' => hash_file('sha256', $path), 'size_bytes' => filesize($path)]);
        $this->verify($manifest->fresh());

        return $manifest->fresh();
    }

    public function verify(BackupManifest $manifest): bool
    {
        $valid = $manifest->path && is_file($manifest->path) && hash_equals((string) $manifest->checksum, hash_file('sha256', $manifest->path));
        $manifest->update(['status' => $valid ? 'verified' : 'failed', 'verified_at' => $valid ? now() : null, 'error_code' => $valid ? null : 'checksum_mismatch']);
        if (! $valid) {
            app(CentralNotificationService::class)->notifyOnce('backup_failed', 'infrastructure', 'critical', 'Backup verification failed', 'Backup '.$manifest->id.' did not pass checksum verification.', route('central.backups.index'), $manifest, [], 1);
        }

        return $valid;
    }
}
