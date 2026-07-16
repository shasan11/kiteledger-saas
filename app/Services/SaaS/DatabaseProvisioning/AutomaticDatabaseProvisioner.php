<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Models\Central\Tenant;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Jobs\CreateDatabase;

class AutomaticDatabaseProvisioner implements TenantDatabaseProvisioner
{
    public function __construct(
        private TenantDatabaseNameGenerator $names,
        private TenantDatabaseNameValidator $validator,
        private TenantDatabaseConnectionVerifier $connections,
    ) {}

    public function provision(Tenant $tenant): void
    {
        if (! $tenant->database_name) {
            $tenant->forceFill(['database_name' => $this->names->generate($tenant->company_name), 'database_provisioning_mode' => 'automatic'])->save();
            $tenant->setInternal('db_name', $tenant->database_name);
            $tenant->save();
        }
        $name = $tenant->database()->getName();
        $this->validator->assertValid($name);

        $existedBeforeProvisioning = $tenant->database()->manager()->databaseExists($name);
        if (! $existedBeforeProvisioning) {
            app()->call([new CreateDatabase($tenant), 'handle']);
        }

        $existedBeforeProvisioning
            ? $this->connections->verifyOwnership($tenant)
            : $this->connections->createOrVerifyOwnership($tenant, 'automatic');
        $tenant->forceFill(['database_provisioning_mode' => 'automatic', 'provisioned_at' => now()])->save();
    }

    public function available(): bool
    {
        if (! in_array(config('database.connections.'.config('tenancy.database.central_connection', 'mysql').'.driver'), ['mysql', 'mariadb'], true)) {
            return false;
        }

        $probe = $this->names->temporaryProbeName();
        try {
            $connection = DB::connection(config('tenancy.database.central_connection'));
            $wrapped = '`'.str_replace('`', '``', $probe).'`';
            $connection->statement("CREATE DATABASE {$wrapped}");
            $exists = (bool) $connection->selectOne('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', [$probe]);
            $connection->statement("DROP DATABASE {$wrapped}");

            return $exists;
        } catch (\Throwable $e) {
            try {
                DB::connection(config('tenancy.database.central_connection'))->statement('DROP DATABASE IF EXISTS `'.str_replace('`', '``', $probe).'`');
            } catch (\Throwable) {
                //
            }

            return false;
        }
    }

    public function destroy(Tenant $tenant): void
    {
        $name = $tenant->database()->getName();
        $this->validator->assertValid($name);
        $this->connections->verifyOwnership($tenant);
        if ($tenant->database()->manager()->databaseExists($name)) {
            $tenant->database()->manager()->deleteDatabase($tenant);
        }
    }

    public function diagnostic(): string
    {
        return $this->available() ? 'CREATE/DROP DATABASE probe succeeded.' : 'automatic_privilege_unavailable';
    }
}
