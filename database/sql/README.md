# Installation SQL dumps

Place a generated MySQL/MariaDB installation dump at:

```text
database/sql/mysql_install.sql
```

When this file exists, the web installer imports it directly instead of
replaying all migrations and seeders. Generate the dump from a clean install
database that already contains the required production seed data.

The installer is a fresh-install flow. It deletes existing tables in the target
database before importing the SQL dump or running migrations.

Generate the dump from a clean temporary MySQL/MariaDB database:

```bash
php artisan install:build-sql --force
```

The command runs `migrate:fresh`, seeds `DatabaseSeeder`, and writes
`database/sql/mysql_install.sql`. Do not run it against a database containing
customer data. The browser installer runs this work in a background worker and
shows progress, so slow hosts do not have to keep one HTTP request open for the
whole migration/seed cycle.

Do not place a SQLite dump in `mysql_install.sql`. MySQL cannot run SQLite
statements such as `PRAGMA foreign_keys = OFF`.
