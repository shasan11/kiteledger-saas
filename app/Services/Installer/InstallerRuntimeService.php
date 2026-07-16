<?php

namespace App\Services\Installer;

use Illuminate\Support\Facades\Artisan;
use RuntimeException;

class InstallerRuntimeService
{
    /** Finalize files that must never point a customer install at dev tooling. */
    public function prepareForProduction(): void
    {
        $this->removeViteHotFile();
        $this->writeEnvironmentValues([
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'SESSION_DRIVER' => 'database',
            // File cache is available before and after database installation,
            // and lets recovery commands such as cache:clear remain usable
            // even when database configuration needs repair.
            'CACHE_STORE' => 'file',
            'QUEUE_CONNECTION' => 'central',
            'CENTRAL_ADMIN_PASSWORD' => '',
        ]);
        config([
            'app.env' => 'production',
            'app.debug' => false,
            'session.driver' => 'database',
            'cache.default' => 'file',
            'queue.default' => 'central',
        ]);

        Artisan::call('optimize:clear');
    }

    public function removeViteHotFile(): void
    {
        $path = public_path('hot');

        if (is_file($path) && ! @unlink($path)) {
            throw new RuntimeException('Could not remove the Vite development marker at public/hot.');
        }
    }

    private function writeEnvironmentValues(array $values): void
    {
        $path = base_path('.env');
        $contents = is_file($path)
            ? file_get_contents($path)
            : file_get_contents(base_path('.env.example'));

        if ($contents === false) {
            throw new RuntimeException('Could not read .env or .env.example.');
        }

        foreach ($values as $key => $value) {
            $line = $key.'='.$value;
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            $contents = preg_match($pattern, $contents)
                ? preg_replace($pattern, $line, $contents)
                : rtrim($contents).PHP_EOL.$line.PHP_EOL;
        }

        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('Could not write production settings to .env.');
        }
    }
}
