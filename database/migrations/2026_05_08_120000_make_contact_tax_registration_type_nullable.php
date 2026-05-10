<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private string $enumValues = "'pan','vat','gstin','tan','ein','sales_tax_permit','state_tax_id','none'";

    public function up(): void
    {
        match (Schema::getConnection()->getDriverName()) {
            'mysql', 'mariadb' => DB::statement(
                "alter table contacts modify tax_registration_type enum({$this->enumValues}) null default null"
            ),
            'pgsql' => DB::statement('alter table contacts alter column tax_registration_type drop not null, alter column tax_registration_type drop default'),
            'sqlite' => $this->alterSqliteColumn(
                '"tax_registration_type" varchar check ("tax_registration_type" in (\'pan\', \'vat\', \'gstin\', \'tan\', \'ein\', \'sales_tax_permit\', \'state_tax_id\', \'none\')) not null default \'none\'',
                '"tax_registration_type" varchar check ("tax_registration_type" in (\'pan\', \'vat\', \'gstin\', \'tan\', \'ein\', \'sales_tax_permit\', \'state_tax_id\', \'none\'))'
            ),
            default => null,
        };
    }

    public function down(): void
    {
        DB::table('contacts')
            ->whereNull('tax_registration_type')
            ->update(['tax_registration_type' => 'none']);

        match (Schema::getConnection()->getDriverName()) {
            'mysql', 'mariadb' => DB::statement(
                "alter table contacts modify tax_registration_type enum({$this->enumValues}) not null default 'none'"
            ),
            'pgsql' => DB::statement("alter table contacts alter column tax_registration_type set default 'none', alter column tax_registration_type set not null"),
            'sqlite' => $this->alterSqliteColumn(
                '"tax_registration_type" varchar check ("tax_registration_type" in (\'pan\', \'vat\', \'gstin\', \'tan\', \'ein\', \'sales_tax_permit\', \'state_tax_id\', \'none\'))',
                '"tax_registration_type" varchar check ("tax_registration_type" in (\'pan\', \'vat\', \'gstin\', \'tan\', \'ein\', \'sales_tax_permit\', \'state_tax_id\', \'none\')) not null default \'none\''
            ),
            default => null,
        };
    }

    private function alterSqliteColumn(string $from, string $to): void
    {
        DB::statement('pragma writable_schema = 1');
        DB::statement(
            "update sqlite_master set sql = replace(sql, ?, ?) where type = 'table' and name = 'contacts'",
            [$from, $to]
        );
        DB::statement('pragma writable_schema = 0');
    }
};
