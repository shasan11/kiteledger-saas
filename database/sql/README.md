# Installation SQL dumps

Place a generated MySQL/MariaDB installation dump at:

```text
database/sql/mysql_install.sql
```

When this file exists, `/install` imports it directly instead of replaying all
migrations and seeders. The installer still writes `.env`, creates/updates the
company, branch, languages, admin user and storage link afterwards.

The installer is a fresh-install flow. It deletes existing tables in the target
database before importing the SQL dump or running migrations.

Generate the dump from a clean temporary MySQL/MariaDB database:

```bash
php artisan install:build-sql --force
```

The command runs `migrate:fresh`, seeds `ProductionSeeder`, and writes
`database/sql/mysql_install.sql`. Do not run it against a database containing
customer data.

Do not place a SQLite dump in `mysql_install.sql`. MySQL cannot run SQLite
statements such as `PRAGMA foreign_keys = OFF`.
