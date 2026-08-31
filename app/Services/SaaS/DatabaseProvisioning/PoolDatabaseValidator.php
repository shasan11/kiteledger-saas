<?php

namespace App\Services\SaaS\DatabaseProvisioning;

use App\Models\Central\Tenant;
use Illuminate\Support\Carbon;
use PDO;
use PDOException;

class PoolDatabaseValidator
{
    public function __construct(private TenantDatabaseNameValidator $names) {}

    /**
     * @param  array{database_name:string,username?:string|null,password?:string|null}  $data
     * @return array{database_name:string,username?:string|null,password?:string|null,status:string,validated_at:Carbon,last_error:null}
     */
    public function validate(array $data): array
    {
        $this->names->assertValid($data['database_name']);

        if (Tenant::withTrashed()->where('database_name', $data['database_name'])->exists()) {
            throw new \RuntimeException('database_already_owned');
        }

        $connection = config('database.connections.'.config('tenancy.database.central_connection', 'mysql'));
        $username = $data['username'] ?? $connection['username'] ?? '';
        $password = $data['password'] ?? $connection['password'] ?? '';
        $pdo = null;
        $probe = null;

        try {
            $pdo = new PDO(
                'mysql:host='.($connection['host'] ?? '127.0.0.1').';port='.($connection['port'] ?? 3306).';dbname='.$data['database_name'].';charset=utf8mb4',
                (string) $username,
                (string) $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
            );
            $tables = $pdo->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"')->fetchAll(PDO::FETCH_NUM);
            if ($tables !== []) {
                throw new \RuntimeException('pool_database_not_empty');
            }
            $probe = 'kiteledger_pool_probe_'.strtolower(bin2hex(random_bytes(5)));
            $wrapped = '`'.str_replace('`', '``', $probe).'`';
            $pdo->exec("CREATE TABLE {$wrapped} (id INT PRIMARY KEY)");
            $pdo->exec("ALTER TABLE {$wrapped} ADD INDEX {$probe}_idx (id)");
            $pdo->exec("INSERT INTO {$wrapped} (id) VALUES (1)");
            $pdo->exec("UPDATE {$wrapped} SET id = 2 WHERE id = 1");
            $pdo->exec("DELETE FROM {$wrapped} WHERE id = 2");
            $pdo->exec("DROP TABLE {$wrapped}");
        } catch (PDOException $e) {
            if ($pdo && $probe) {
                try {
                    $pdo->exec('DROP TABLE IF EXISTS `'.str_replace('`', '``', $probe).'`');
                } catch (\Throwable) {
                    //
                }
            }

            throw new \RuntimeException('pool_database_invalid', previous: $e);
        }

        return $data + ['status' => 'available', 'validated_at' => now(), 'last_error' => null];
    }
}
