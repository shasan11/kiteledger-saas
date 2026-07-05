# SaaS operations and security

Tenant operational state and subscription billing state are independent. Billing expiry restricts access but never deletes tenant data. Permanent deletion requires a separate delayed request, password and typed confirmation, authorization, an immutable audit entry, and either a verified final backup or an explicit waiver.

Central infrastructure includes tenant-bound sessions, prefixed cache entries, locks, queues, lifecycle records, usage reservations, provisioning attempts, billing records, backup manifests, and deletion requests. ERP records remain exclusively in tenant databases. Tenant models fail closed when tenancy is not initialized in production.

Quota values use `null` for unlimited, `0` for disabled, and positive values as hard limits. Mutating requests reserve quota atomically, finalize successful work, release failed work, and expire abandoned reservations. Reconciliation corrects drift and produces usage snapshots.

Hosted gateways receive no raw card details. Webhooks are signature-checked before persistence, deduplicated by provider event ID, sanitized, queued centrally, and transactionally reconcile payment, invoice, and subscription state. Paid invoices are immutable; corrections use refunds or credit notes.

Backups must cover the central database, each tenant database, and tenant file roots. Retain an off-host encrypted copy and test restores regularly. Provider-level cPanel backups remain the safest fallback when `mysqldump` is unavailable.
