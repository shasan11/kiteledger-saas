<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CpanelUapiDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function __construct(
        private TenantDatabaseNameGenerator $names,
        private TenantDatabaseNameValidator $validator,
        private TenantDatabaseConnectionVerifier $connections,
        private CpanelIdentifierNormalizer $normalizer,
    ) {}

    public function provision(Tenant $tenant): void
    {
        if (! $this->available()) {
            throw new \RuntimeException('cpanel_not_configured');
        }
        if (! $tenant->database_name) {
            $tenant->forceFill(['database_name' => $this->names->generate($tenant->company_name), 'database_provisioning_mode' => 'cpanel_uapi'])->save();
            $tenant->setInternal('db_name', $tenant->database_name);
            $tenant->save();
        }
        $database = $this->normalizer->normalizeDatabase($tenant->database()->getName());
        $databaseUser = $this->normalizer->normalizeUser((string) config('saas.database.cpanel.database_user'));
        $this->validator->assertValid($database);
        $existedBeforeProvisioning = $this->databaseExists($database);

        if (! $existedBeforeProvisioning) {
            try {
                $this->call('Mysql/create_database', ['name' => $database]);
            } catch (\Throwable $e) {
                throw new \RuntimeException('cpanel_database_create_failed', previous: $e);
            }
        }
        try {
            $this->call('Mysql/set_privileges_on_database', [
                'database' => $database,
                'user' => $databaseUser,
                'privileges' => 'ALL PRIVILEGES',
            ]);
        } catch (\Throwable $e) {
            if (! $existedBeforeProvisioning) {
                $this->safeDelete($database);
            }
            throw new \RuntimeException('cpanel_privilege_assignment_failed', previous: $e);
        }

        $password = $this->databasePassword();
        $tenant->forceFill([
            'database_name' => $database,
            'database_provisioning_mode' => 'cpanel_uapi',
            'database_username' => $databaseUser,
            'database_password' => $password,
            'database_server' => config('saas.database.cpanel.host'),
            'database_ownership_id' => $tenant->database_ownership_id ?: (string) Str::uuid(),
        ]);
        $tenant->setInternal('db_name', $database);
        $tenant->setInternal('db_username', $databaseUser);
        if ($password !== null) {
            $tenant->setInternal('db_password', $password);
        }
        $tenant->save();

        try {
            $existedBeforeProvisioning
                ? $this->connections->verifyOwnership($tenant)
                : $this->connections->createOrVerifyOwnership($tenant, 'cpanel_uapi');
        } catch (\Throwable $e) {
            if (! $existedBeforeProvisioning) {
                $this->safeDelete($database);
            }
            throw new \RuntimeException('cpanel_connection_failed', previous: $e);
        }
        $tenant->forceFill(['provisioned_at' => now()])->save();
    }

    public function available(): bool
    {
        return filled(config('saas.database.cpanel.host'))
            && filled(config('saas.database.cpanel.username'))
            && filled(config('saas.database.cpanel.token'))
            && filled(config('saas.database.cpanel.database_user'));
    }

    public function destroy(Tenant $tenant): void
    {
        $database = $this->normalizer->normalizeDatabase($tenant->database()->getName());
        $this->validator->assertValid($database);
        $this->connections->verifyOwnership($tenant);
        $this->call('Mysql/delete_database', ['name' => $database]);
    }

    public function diagnostic(): string
    {
        return $this->available() ? 'cPanel UAPI credentials are configured.' : 'cpanel_not_configured';
    }

    private function call(string $operation, array $query): array
    {
        $response = $this->client()->get(rtrim(config('saas.database.cpanel.host'), '/').':'.config('saas.database.cpanel.port').'/execute/'.$operation, $query);
        $response->throw();
        $result = $response->json('result');
        if (! is_array($result) || (int) ($result['status'] ?? 0) !== 1) {
            throw new \RuntimeException('cpanel_uapi_request_failed');
        }

        return $result;
    }

    private function databaseExists(string $database): bool
    {
        $result = $this->call('Mysql/list_databases', []);

        foreach ((array) ($result['data'] ?? []) as $row) {
            $name = is_array($row) ? ($row['database'] ?? $row['db'] ?? $row['name'] ?? null) : $row;
            if ((string) $name === $database) {
                return true;
            }
        }

        return false;
    }

    private function safeDelete(string $database): void
    {
        try {
            $this->call('Mysql/delete_database', ['name' => $database]);
        } catch (\Throwable) {
            //
        }
    }

    private function databasePassword(): ?string
    {
        $configured = config('saas.database.cpanel.database_password');
        if (filled($configured)) {
            return (string) $configured;
        }

        if ((string) config('saas.database.cpanel.database_user') === (string) config('database.connections.'.config('tenancy.database.central_connection', 'mysql').'.username')) {
            return (string) config('database.connections.'.config('tenancy.database.central_connection', 'mysql').'.password');
        }

        return null;
    }

    private function client(): PendingRequest
    {
        return Http::asJson()->acceptJson()->withHeaders([
            'Authorization' => 'cpanel '.config('saas.database.cpanel.username').':'.config('saas.database.cpanel.token'),
        ])->connectTimeout(10)->timeout(30);
    }
}
