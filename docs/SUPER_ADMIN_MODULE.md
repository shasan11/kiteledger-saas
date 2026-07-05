# Central super admin

Open `/admin/login` on a configured central host. The seeded credentials come from `CENTRAL_ADMIN_EMAIL` and `CENTRAL_ADMIN_PASSWORD`; change them immediately. A first or replacement administrator can be created without a tenant database:

```bash
php artisan central-admin:create owner@example.com --name="Platform Owner"
```

The panel includes platform metrics, tenant lifecycle/provisioning logs, domains, plans and limits, subscriptions, invoices/transactions/gateways, CMS records, default templates, settings, and usage. Central roles store explicit permissions; `super_admin` bypasses them. Normal company roles never authorize central routes.

Tenant creation requires company/owner details, a non-reserved subdomain, optional plan/template, and a strong owner password. Suspension is reversible and never deletes the tenant database.
