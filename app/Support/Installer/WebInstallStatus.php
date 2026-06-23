<?php

namespace App\Support\Installer;

use Illuminate\Support\Str;

class WebInstallStatus
{
    public function path(): string
    {
        return storage_path('app/install/status.json');
    }

    public function read(): array
    {
        $path = $this->path();

        if (! is_file($path)) {
            return $this->fresh();
        }

        $decoded = json_decode((string) @file_get_contents($path), true);

        return is_array($decoded) ? array_replace($this->fresh(), $decoded) : $this->fresh();
    }

    public function reset(): void
    {
        $this->write($this->fresh());
    }

    public function start(): array
    {
        $state = array_replace($this->fresh(), [
            'state' => 'running',
            'token' => Str::random(40),
            'step' => 'Starting installer',
            'message' => 'Preparing database installation.',
            'started_at' => now()->toIso8601String(),
            'updated_at' => now()->toIso8601String(),
            'log' => [
                $this->line('Starting installer worker.'),
            ],
        ]);

        $this->write($state);

        return $state;
    }

    public function progress(string $message, ?string $step = null): void
    {
        $state = $this->read();
        $state['state'] = 'running';
        $state['step'] = $step ?: $message;
        $state['message'] = $message;
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], $message);

        $this->write($state);
    }

    public function succeeded(string $message): void
    {
        $state = $this->read();
        $state['state'] = 'succeeded';
        $state['step'] = 'Finished';
        $state['message'] = $message;
        $state['finished_at'] = now()->toIso8601String();
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], $message);

        $this->write($state);
    }

    public function failed(string $message): void
    {
        $state = $this->read();
        $state['state'] = 'failed';
        $state['step'] = 'Failed';
        $state['message'] = $message;
        $state['finished_at'] = now()->toIso8601String();
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], $message);

        $this->write($state);
    }

    public function tokenMatches(string $token): bool
    {
        $state = $this->read();

        return ($state['state'] ?? null) === 'running'
            && hash_equals((string) ($state['token'] ?? ''), $token);
    }

    public function isStale(array $state): bool
    {
        if (($state['state'] ?? null) !== 'running') {
            return false;
        }

        $updatedAt = strtotime((string) ($state['updated_at'] ?? ''));

        return $updatedAt !== false && $updatedAt < now()->subHours(6)->getTimestamp();
    }

    private function fresh(): array
    {
        return [
            'state' => 'idle',
            'token' => null,
            'step' => null,
            'message' => 'Installer has not started.',
            'started_at' => null,
            'finished_at' => null,
            'updated_at' => null,
            'log' => [],
        ];
    }

    private function appendLog(array $log, string $message): array
    {
        $log[] = $this->line($message);

        return array_slice($log, -80);
    }

    private function line(string $message): string
    {
        return '['.now()->format('Y-m-d H:i:s').'] '.$message;
    }

    private function write(array $state): void
    {
        $directory = dirname($this->path());

        if (! is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }

        file_put_contents(
            $this->path(),
            json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL,
            LOCK_EX
        );
    }
}
