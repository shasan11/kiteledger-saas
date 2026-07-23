# Database-per-tenant architecture

KiteLedger uses stancl/tenancy v3. The default `central` connection contains platform administration, plans, subscriptions, domains, provisioning/audit records, CMS data, central queues, cache and sessions. Every customer receives an independent database containing users, roles, settings and all ERP business tables.

Tenant requests are selected by hostname. Central hosts come from `CENTRAL_DOMAINS`; tenant routes reject those hosts and central routes reject every other host. A tenant must have a verified domain and `active` status before its web or API routes run.

Never add `tenant_id` to ERP tables as a substitute for isolation. Central models belong under `App\Models\Central` (or use Stancl's central connection concern); tenant models must only be queried after tenancy has initialized.

The tenant migration path is `database/migrations/tenant`. Central installation must never load that path.
