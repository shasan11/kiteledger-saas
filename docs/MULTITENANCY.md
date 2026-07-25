# Database-per-tenant architecture

KiteLedger uses stancl/tenancy v3. The default `central` connection contains platform administration, plans, subscriptions, domains, provisioning/audit records, CMS data, central queues, cache and sessions. Every customer receives an independent database containing users, roles, settings and all ERP business tables.

Tenant requests are selected by hostname. Central hosts come from `CENTRAL_DOMAINS`; tenant routes reject those hosts and central routes reject every other host. A tenant must have a verified domain and `active` status before its web or API routes run.

Never add `tenant_id` to ERP tables as a substitute for isolation. Central models belong under `App\Models\Central` (or use Stancl's central connection concern); tenant models must only be queried after tenancy has initialized.

The tenant migration path is `database/migrations/tenant`. Central installation must never load that path.

Tenant creation from the central admin is synchronous. The request commits the central tenant, encrypted provisioning configuration, and exact verified subdomain first; `TenantProvisioningRunner` then provisions or verifies the database, saves Stancl connection internals, migrates, seeds, applies the default template, creates the owner and optional subscription, and finally marks the tenant `active`. Failures preserve the tenant and record a safe `provisioning_failed` state for retry. Queue workers are not involved in this initial flow.
