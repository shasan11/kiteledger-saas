<?php

namespace App\Support\Installer;

use Froiden\LaravelInstaller\Helpers\InstalledFileManager;

class FroidenInstalledFileManager extends InstalledFileManager
{
    public function create()
    {
        InstalledState::mark();

        return 1;
    }

    public function update()
    {
        return $this->create();
    }
}
