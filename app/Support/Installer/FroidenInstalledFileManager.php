<?php

namespace App\Support\Installer;

use App\Services\Installer\InstallerRuntimeService;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;

class FroidenInstalledFileManager extends InstalledFileManager
{
    public function create()
    {
        if (! app()->environment('testing')) {
            app(InstallerRuntimeService::class)->prepareForProduction();
        }

        InstalledState::mark();

        return 1;
    }

    public function update()
    {
        return $this->create();
    }
}
