<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the invalid FK constraint on users.role_id -> roles (table does not exist).
 * SQLite requires a full table rebuild to drop a FK constraint.
 * MySQL/Postgres just drop the foreign key directly.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // Only rebuild if the invalid FK actually exists
            $ddl = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
            $sql = $ddl[0]->sql ?? '';
            if (!str_contains($sql, "references \"roles\"") && !str_contains($sql, 'references roles')) {
                return; // Already clean, nothing to do
            }

            DB::statement('PRAGMA foreign_keys = OFF');
            DB::statement('BEGIN TRANSACTION');

            DB::statement('CREATE TABLE "users_rebuilt" (
                "id" integer primary key autoincrement not null,
                "name" varchar not null,
                "email" varchar not null,
                "email_verified_at" datetime,
                "password" varchar not null,
                "remember_token" varchar,
                "created_at" datetime,
                "updated_at" datetime,
                "branch_id" varchar,
                "first_name" varchar,
                "last_name" varchar,
                "username" varchar,
                "phone" varchar,
                "blood_group" varchar,
                "image" varchar,
                "street" varchar,
                "city" varchar,
                "state" varchar,
                "zip_code" varchar,
                "country" varchar,
                "employee_id" varchar,
                "join_date" date,
                "leave_date" date,
                "employment_status_id" varchar,
                "department_id" varchar,
                "role_id" varchar,
                "shift_id" varchar,
                "leave_policy_id" varchar,
                "weekly_holiday_id" varchar,
                "active" tinyint(1) not null default \'1\',
                "is_system_generated" tinyint(1) not null default \'0\',
                "user_add_id" varchar,
                foreign key("branch_id") references "branches"("id") on delete set null on update no action,
                foreign key("employment_status_id") references "employment_statuses"("id") on delete set null,
                foreign key("department_id") references "departments"("id") on delete set null,
                foreign key("shift_id") references "shifts"("id") on delete set null,
                foreign key("leave_policy_id") references "leave_policies"("id") on delete set null,
                foreign key("weekly_holiday_id") references "weekly_holidays"("id") on delete set null,
                foreign key("user_add_id") references "users_rebuilt"("id") on delete set null
            )');

            DB::statement('INSERT INTO "users_rebuilt" SELECT
                id, name, email, email_verified_at, password, remember_token,
                created_at, updated_at, branch_id, first_name, last_name, username, phone,
                blood_group, image, street, city, state, zip_code, country, employee_id,
                join_date, leave_date, employment_status_id, department_id, role_id,
                shift_id, leave_policy_id, weekly_holiday_id, active, is_system_generated,
                user_add_id
            FROM "users"');

            DB::statement('DROP TABLE "users"');
            DB::statement('ALTER TABLE "users_rebuilt" RENAME TO "users"');

            // Recreate unique indexes
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users"("email")');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users"("username")');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_employee_id_unique" ON "users"("employee_id")');

            DB::statement('COMMIT');
            DB::statement('PRAGMA foreign_keys = ON');

        } elseif ($driver === 'mysql') {
            // Check if the FK exists before trying to drop it
            $fks = DB::select("
                SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND REFERENCED_TABLE_NAME = 'roles'
                LIMIT 1
            ");
            foreach ($fks as $fk) {
                Schema::table('users', fn ($t) => $t->dropForeign($fk->CONSTRAINT_NAME));
            }
        }
    }

    public function down(): void
    {
        // Intentionally not reversible — the original constraint referenced a non-existent table
    }
};
