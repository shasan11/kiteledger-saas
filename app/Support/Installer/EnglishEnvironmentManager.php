<?php

namespace App\Support\Installer;

use Exception;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\Request;

class EnglishEnvironmentManager extends EnvironmentManager
{
    private string $envPath;

    private string $envExamplePath;

    public function __construct()
    {
        $this->envPath = base_path('.env');
        $this->envExamplePath = base_path('.env.example');
    }

    public function getEnvContent(): string
    {
        if (! is_file($this->envPath)) {
            if (is_file($this->envExamplePath)) {
                copy($this->envExamplePath, $this->envPath);
            } else {
                touch($this->envPath);
            }
        }

        return (string) file_get_contents($this->envPath);
    }

    public function saveFile(Request $input)
    {
        $env = $this->getEnvContent();
        $dbName = (string) $input->get('database');
        $dbHost = (string) $input->get('hostname');
        $dbUsername = (string) $input->get('username');
        $dbPassword = (string) $input->get('password', '');
        $appUrl = rtrim(request()->getSchemeAndHttpHost(), '/');

        try {
            $dbh = new \PDO('mysql:host='.$dbHost.';charset=utf8mb4', $dbUsername, $dbPassword);
            $dbh->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $dbh->exec('CREATE DATABASE IF NOT EXISTS `'.str_replace('`', '``', $dbName).'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

            foreach ([
                'DB_CONNECTION' => 'mysql',
                'DB_HOST' => $dbHost,
                'DB_DATABASE' => $dbName,
                'DB_USERNAME' => $dbUsername,
                'DB_PASSWORD' => $dbPassword,
                'APP_URL' => $appUrl,
            ] as $key => $value) {
                $env = $this->setEnvValue($env, $key, $value);
            }

            file_put_contents($this->envPath, $env, LOCK_EX);
            $this->clearCachedConfig();

            $_SESSION['db_username'] = $dbUsername;
            $_SESSION['db_password'] = $dbPassword;
            $_SESSION['db_name'] = $dbName;
            $_SESSION['db_host'] = $dbHost;
            $_SESSION['db_success'] = true;

            return Reply::redirect(route('LaravelInstaller::requirements'), 'Database settings correct');
        } catch (\PDOException $e) {
            return Reply::error('DB Error: '.$e->getMessage());
        } catch (Exception $e) {
            return Reply::error('Unable to save the .env file. Please create it manually.');
        }
    }

    private function setEnvValue(string $contents, string $key, string $value): string
    {
        $line = $key.'='.$this->formatEnvValue($value);
        $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

        if (preg_match($pattern, $contents)) {
            return (string) preg_replace($pattern, $line, $contents, 1);
        }

        return rtrim($contents, "\r\n").PHP_EOL.$line.PHP_EOL;
    }

    private function formatEnvValue(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/\s|#|"|\'/', $value)) {
            return '"'.str_replace('"', '\"', $value).'"';
        }

        return $value;
    }

    private function clearCachedConfig(): void
    {
        foreach ([
            base_path('bootstrap/cache/config.php'),
            base_path('bootstrap/cache/routes-v7.php'),
            base_path('bootstrap/cache/routes.php'),
        ] as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
