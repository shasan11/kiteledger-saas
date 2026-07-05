<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class FirstBootEnvironmentTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();

        $project = dirname(__DIR__, 2);
        $this->directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'kiteledger-first-boot-'.bin2hex(random_bytes(8));
        mkdir($this->directory.DIRECTORY_SEPARATOR.'bootstrap', 0777, true);
        copy($project.DIRECTORY_SEPARATOR.'bootstrap/first-boot.php', $this->directory.DIRECTORY_SEPARATOR.'bootstrap/first-boot.php');
        copy($project.DIRECTORY_SEPARATOR.'.env.example', $this->directory.DIRECTORY_SEPARATOR.'.env.example');
    }

    protected function tearDown(): void
    {
        foreach (['.env', '.env.example', 'bootstrap/first-boot.php'] as $file) {
            @unlink($this->directory.DIRECTORY_SEPARATOR.$file);
        }
        @rmdir($this->directory.DIRECTORY_SEPARATOR.'bootstrap');
        @rmdir($this->directory);

        parent::tearDown();
    }

    public function test_missing_environment_is_created_before_laravel_boots(): void
    {
        $previousHost = $_SERVER['HTTP_HOST'] ?? null;
        $previousHttps = $_SERVER['HTTPS'] ?? null;
        $_SERVER['HTTP_HOST'] = 'vedanica.com';
        $_SERVER['HTTPS'] = 'on';

        try {
            $created = require $this->directory.DIRECTORY_SEPARATOR.'bootstrap/first-boot.php';
        } finally {
            $this->restoreServerValue('HTTP_HOST', $previousHost);
            $this->restoreServerValue('HTTPS', $previousHttps);
        }

        $this->assertTrue($created);
        $contents = file_get_contents($this->directory.DIRECTORY_SEPARATOR.'.env');
        $this->assertIsString($contents);
        $this->assertMatchesRegularExpression('/^APP_KEY=base64:.+$/m', $contents);
        $this->assertStringContainsString('APP_ENV=production', $contents);
        $this->assertStringContainsString('APP_DEBUG=false', $contents);
        $this->assertStringContainsString('APP_URL=https://vedanica.com', $contents);
        $this->assertStringContainsString('CENTRAL_DOMAINS=vedanica.com', $contents);
        $this->assertStringContainsString('SAAS_BASE_DOMAIN=vedanica.com', $contents);
        $this->assertStringContainsString('SESSION_DRIVER=file', $contents);
        $this->assertStringContainsString('CACHE_STORE=file', $contents);
        $this->assertStringContainsString('QUEUE_CONNECTION=sync', $contents);

        $original = $contents;
        $this->assertTrue(require $this->directory.DIRECTORY_SEPARATOR.'bootstrap/first-boot.php');
        $this->assertSame($original, file_get_contents($this->directory.DIRECTORY_SEPARATOR.'.env'));
    }

    public function test_incomplete_existing_environment_is_repaired_automatically(): void
    {
        file_put_contents($this->directory.DIRECTORY_SEPARATOR.'.env', implode(PHP_EOL, [
            'APP_KEY=',
            'APP_ENV=local',
            'APP_DEBUG=true',
            'DB_CONNECTION=sqlite',
            'SESSION_DRIVER=database',
            'CACHE_STORE=database',
            'QUEUE_CONNECTION=database',
            '',
        ]));

        $this->assertTrue(require $this->directory.DIRECTORY_SEPARATOR.'bootstrap/first-boot.php');

        $contents = file_get_contents($this->directory.DIRECTORY_SEPARATOR.'.env');
        $this->assertIsString($contents);
        $this->assertMatchesRegularExpression('/^APP_KEY=base64:.+$/m', $contents);
        $this->assertStringContainsString('APP_ENV=production', $contents);
        $this->assertStringContainsString('APP_DEBUG=false', $contents);
        $this->assertStringContainsString('DB_CONNECTION=mysql', $contents);
        $this->assertStringContainsString('SESSION_DRIVER=file', $contents);
        $this->assertStringContainsString('CACHE_STORE=file', $contents);
        $this->assertStringContainsString('QUEUE_CONNECTION=sync', $contents);
    }

    private function restoreServerValue(string $key, ?string $value): void
    {
        if ($value === null) {
            unset($_SERVER[$key]);

            return;
        }

        $_SERVER[$key] = $value;
    }
}
