<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class CpanelUapiDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function provision(Tenant $tenant): void
    {
        if (! $this->available()) {
            throw new \RuntimeException('cpanel_uapi_not_configured');
        }
        $database = $tenant->database()->getName();
        if (! preg_match('/^[A-Za-z0-9_]+$/', $database) || strlen($database) > 64 || ! str_starts_with($database, config('tenancy.database.prefix'))) {
            throw new \RuntimeException('tenant_database_name_invalid');
        }

        $this->call('Mysql/create_database', ['name' => $database]);
        $this->call('Mysql/set_privileges_on_database', [
            'database' => $database,
            'user' => config('saas.database.cpanel.database_user'),
            'privileges' => 'ALL PRIVILEGES',
        ]);
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
        $database = $tenant->database()->getName();
        if (! str_starts_with($database, config('tenancy.database.prefix')) || ! preg_match('/^[A-Za-z0-9_]{1,64}$/', $database)) {
            throw new \RuntimeException('tenant_database_name_invalid');
        }
        $this->call('Mysql/delete_database', ['name' => $database]);
    }

    public function diagnostic(): string
    {
        return $this->available() ? 'cPanel UAPI credentials are configured.' : 'Set CPANEL_HOST, CPANEL_USERNAME, CPANEL_API_TOKEN, and CPANEL_DATABASE_USER.';
    }

    private function call(string $operation, array $query): array
    {
        $response = $this->client()->get(rtrim(config('saas.database.cpanel.host'), '/').':'.config('saas.database.cpanel.port').'/execute/'.$operation, $query);
        $response->throw();
        $result = $response->json('result');
        if (! is_array($result) || (int) ($result['status'] ?? 0) !== 1) {
            throw new \RuntimeException('cpanel_uapi_request_failed: '.collect($result['errors'] ?? [])->join('; '));
        }

        return $result;
    }

    private function client(): PendingRequest
    {
        return Http::asJson()->acceptJson()->withHeaders([
            'Authorization' => 'cpanel '.config('saas.database.cpanel.username').':'.config('saas.database.cpanel.token'),
        ])->connectTimeout(10)->timeout(30)->retry(2, 250, throw: false);
    }
}
