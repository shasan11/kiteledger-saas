<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        match (Schema::getConnection()->getDriverName()) {
            'mysql', 'mariadb' => $this->alterMysql(nullable: true),
            'pgsql' => DB::statement('alter table deals alter column amount drop not null, alter column amount drop default, alter column probability drop not null, alter column probability drop default'),
            'sqlite' => $this->alterSqlite(nullable: true),
            default => null,
        };
    }

    public function down(): void
    {
        DB::table('deals')->whereNull('amount')->update(['amount' => 0]);
        DB::table('deals')->whereNull('probability')->update(['probability' => 0]);

        match (Schema::getConnection()->getDriverName()) {
            'mysql', 'mariadb' => $this->alterMysql(nullable: false),
            'pgsql' => DB::statement('alter table deals alter column amount set default 0, alter column amount set not null, alter column probability set default 0, alter column probability set not null'),
            'sqlite' => $this->alterSqlite(nullable: false),
            default => null,
        };
    }

    private function alterMysql(bool $nullable): void
    {
        $nullSql = $nullable ? 'null default null' : 'not null default 0';

        DB::statement("alter table deals modify amount decimal(16, 2) {$nullSql}");
        DB::statement("alter table deals modify probability tinyint unsigned {$nullSql}");
    }

    private function alterSqlite(bool $nullable): void
    {
        $replacements = $nullable
            ? [
                ['"amount" numeric not null default \'0\'', '"amount" numeric'],
                ['"probability" integer not null default \'0\'', '"probability" integer'],
            ]
            : [
                ['"amount" numeric', '"amount" numeric not null default \'0\''],
                ['"probability" integer', '"probability" integer not null default \'0\''],
            ];

        DB::statement('pragma writable_schema = 1');

        foreach ($replacements as [$from, $to]) {
            DB::statement(
                "update sqlite_master set sql = replace(sql, ?, ?) where type = 'table' and name = 'deals'",
                [$from, $to]
            );
        }

        DB::statement('pragma writable_schema = 0');
    }
};
