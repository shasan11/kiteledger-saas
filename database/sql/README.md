# MySQL installation dump

Place the generated dump at `database/sql/mysql_install.sql`. When present, the
MySQL/MariaDB web installer streams this file instead of replaying migrations
and base seeders. PostgreSQL and SQLite ignore it.

Generate it from a new disposable MySQL/MariaDB database:

```bash
php artisan install:build-sql --force
```

This command runs `migrate:fresh`, seeds only `CentralDatabaseSeeder`, removes
the build machine's administrator row, and destroys the configured database
contents. The browser installer recreates the buyer's administrator after
import. Never point it at customer data. Do not place a SQLite or PostgreSQL
dump at this path. The one canonical filename is
`database/sql/mysql_install.sql`.
