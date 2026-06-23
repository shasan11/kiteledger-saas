<?php

namespace App\Support\Installer;

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

    public function begin(): array
    {
        $state = array_replace($this->fresh(), [
            'state' => 'running',
            'step' => 'Starting installer',
            'message' => 'Preparing database installation. This can take a minute. Keep this tab open.',
            'started_at' => now()->toIso8601String(),
            'updated_at' => now()->toIso8601String(),
            'log' => [$this->line('Installer started.')],
        ]);

        $this->write($state);

        return $state;
    }

    public function workerStarted(string $command): void
    {
        $state = $this->read();
        $state['state'] = 'running';
        $state['worker_started_at'] = $state['worker_started_at'] ?: now()->toIso8601String();
        $state['locked_at'] = $state['locked_at'] ?: now()->toIso8601String();
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], "Background command launched: {$command}");

        $this->write($state);
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
        $state['locked_at'] = null;
        $state['finished_at'] = now()->toIso8601String();
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], "Succeeded: {$message}");

        $this->write($state);
    }

    public function failed(string $message): void
    {
        $state = $this->read();
        $state['state'] = 'failed';
        $state['step'] = 'Failed';
        $state['message'] = $message;
        $state['locked_at'] = null;
        $state['finished_at'] = now()->toIso8601String();
        $state['updated_at'] = now()->toIso8601String();
        $state['log'] = $this->appendLog($state['log'] ?? [], "Failed: {$message}");

        $this->write($state);
    }

    public function hasWorkerStarted(array $state): bool
    {
        return filled($state['worker_started_at'] ?? null)
            || filled($state['locked_at'] ?? null);
    }

    private function fresh(): array
    {
        return [
            'state' => 'idle',
            'step' => null,
            'message' => 'Installer has not started.',
            'started_at' => null,
            'worker_started_at' => null,
            'finished_at' => null,
            'updated_at' => null,
            'locked_at' => null,
            'log' => [],
        ];
    }

    private function appendLog(array $log, string $message): array
    {
        $log[] = $this->line($message);

        return array_slice($log, -100);
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
