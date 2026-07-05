<?php

namespace App\Contracts\SaaS;

use App\Models\Central\BackupManifest;
use App\Models\Central\Tenant;

interface BackupManager
{
    public function backupTenant(Tenant $tenant): BackupManifest;

    public function verify(BackupManifest $manifest): bool;
}
