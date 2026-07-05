# Legacy Single-Company → SaaS Migration

This guide covers migrating an existing single-company KiteLedger installation
(all ERP data in one database) into the multi-tenant SaaS platform, where each
company's ERP data lives in its own isolated database.

## What the migration does

`php artisan saas:migrate-legacy-company` performs a **non-destructive** copy:

1. Detects the installation type (fresh / legacy / already migrated).
2. Creates the first **central tenant record** and its primary subdomain.
3. Creates an **isolated tenant database**.
4. Runs the tenant ERP migrations (empty schema).
5. **Copies every ERP table row-for-row** from the legacy database into the
   tenant database, preserving UUIDs, branches, users, roles/permissions,
   password hashes, documents, settings and numbering sequences.
6. Starts the tenant's trial/subscription.
7. **Verifies** row-count parity per table and reports key entity totals.
8. Marks the tenant `active`/`trialing` only if verification passes.

> The legacy database is **never truncated or dropped**. After you confirm the
> tenant is correct, you archive/remove the old ERP tables manually.

## Installation-type detection

| Type | Meaning | Command behaviour |
|------|---------|-------------------|
| `fresh_saas` | Central schema present, no ERP rows | Refuses — nothing to migrate |
| `legacy_single_company` | ERP `users`/`branches` populated in central DB, no tenants yet | Proceeds |
| `already_migrated` | One or more tenant records exist | Refuses unless `--resume` |

## Prerequisites

- A **verified backup** of the legacy database. The command asks for explicit
  confirmation (or pass `--backup-confirmed`).
- The central DB user must be able to `CREATE DATABASE` (verify with
  `php artisan saas:health`). On restricted shared hosting, pre-create the tenant
  database manually and see "Manual database mode" below.
- At least one active plan (or pass `--plan`).

## Dry run (recommended first)

```bash
php artisan saas:migrate-legacy-company --dry-run
```

Validates the target subdomain and prints the row count that would be copied for
every ERP table. **No tenant record or database is created or modified.**

## Live migration

```bash
php artisan saas:migrate-legacy-company \
  --company="Acme Ltd" \
  --owner-name="Ada Lovelace" \
  --owner-email="ada@acme.com" \
  --subdomain=acme \
  --plan=starter \
  --backup-confirmed
```

In production, add `--force`. Omitted options are prompted interactively.

## Resume / retry

Every step records its status in the central `legacy_migration_runs` table. If a
run fails midway, fix the cause and re-run:

```bash
php artisan saas:migrate-legacy-company --resume
```

Completed steps (`tenant`, `database`, `migrations`, `copy`, `subscription`) are
skipped. The data copy replaces each table's contents, so it is safe to re-run.

## Verification report

On completion the command prints:

- Per-table source vs. destination row counts (mismatches abort completion).
- Key entity totals: users, branches, products, invoices, invoice total,
  journal debit total.

You can re-query the durable log at any time:

```sql
SELECT id, tenant_id, status, dry_run, started_at, finished_at
FROM legacy_migration_runs ORDER BY id DESC;
```

## Manual database mode (restricted hosting)

If the central DB user cannot `CREATE DATABASE`:

1. Ask your host to create an empty database whose name matches
   `TENANT_DB_PREFIX` + the tenant UUID (without dashes). Run a `--dry-run`
   first to create the tenant record, note its `id`, then create the DB.
2. Grant the app user full privileges on it.
3. Re-run with `--resume`; the `database` step detects the existing database and
   proceeds to migrations and copy.

## Rollback & recovery

Because the legacy database is untouched, rollback is simply:

1. Drop the tenant database that was created:
   `php artisan tenants:run 'db:wipe' --tenants=<id>` then remove the DB, or drop
   it directly in your DB console.
2. Delete the central tenant record and its domain
   (`Tenant::find(<id>)->delete()`), or `--force` a hard delete.
3. Point the application back at the legacy single-company setup.

Keep the legacy database until the tenant has run correctly for a full billing
cycle.

## After a successful migration

- Log in at `https://<subdomain>.<base-domain>` with the original user
  credentials (password hashes are preserved).
- Confirm branches, invoices, products, accounting balances and document
  numbering continue from where they left off.
- Only then archive the legacy ERP tables.
