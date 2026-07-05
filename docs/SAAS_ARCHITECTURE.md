# KiteLedger SaaS architecture

## Database boundary

The default Laravel connection is the **central database**. It contains only platform records: central administrators, tenants/domains, plans, subscriptions, tenant invoices and payments, CMS data, default-data templates, platform settings, usage snapshots, provisioning logs, and audit logs.

The existing ERP schema lives in `database/migrations/tenant`. `stancl/tenancy` v3.10 creates a separate database and switches Laravel's `tenant` connection before tenant routes execute. Users, branches, products, invoices, accounting, POS, inventory, HRM, CRM, permissions and company settings never belong in the central database. A branch remains an operating unit inside one tenant.

HTTP routing is host-isolated:

- `routes/web.php`: exact central hosts from `CENTRAL_DOMAINS`.
- `routes/tenant.php`: tenant web application, initialized by domain.
- `routes/api.php`: tenant API, initialized by domain under `/api`.

Cache, queue payloads and local/public storage are tenant-aware through tenancy bootstrappers. The central models use the forced central connection even if they are read during a tenant request.

## Main services

- `TenantProvisioningService`: validates and records a company, domain and queued provisioning request.
- `TenantDomainService`: reserved-name protection and normalized subdomain/custom-domain creation.
- `DefaultTemplateService`: applies allow-listed template categories after production-safe tenant seeding.
- `SubscriptionService`, `PlanLimitService`, `TenantUsageService`: access state, backend feature/limit checks and usage snapshots.
- `PaymentManager`: resolves encrypted gateway configuration. Manual payments work without a provider SDK; Stripe/PayPal/Razorpay adapters deliberately fail closed until their APIs are configured.

Central and tenant authentication are separate. `central_admin_users` uses a dedicated central session key; tenant `users` and Spatie roles remain inside each tenant database.

## Security model

Central and tenant route hosts cannot overlap. Gateway secrets and marked platform settings are encrypted at rest. Tenant status and subscription middleware run before ERP dashboards. Domain values are normalized, globally unique, and reserved subdomains are rejected. Tenant deletion is soft by default; database deletion is not connected to normal admin actions.
