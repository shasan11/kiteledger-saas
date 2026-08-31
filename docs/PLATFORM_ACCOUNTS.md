# Platform Accounts, Tenant Memberships and Customer Billing

KiteLedger now has three separate identity concepts. They never overlap.

| Concept | Model | Lives in | Guard | Who |
| --- | --- | --- | --- | --- |
| Tenant user | `App\Models\User` | tenant database | `tenant` | Accountant, sales, HR, warehouse staff |
| Central administrator | `App\Models\Central\CentralAdmin` | central database | `central` | KiteLedger operators, support, billing |
| Platform user | `App\Models\Central\CentralUser` | central database | `platform` | Customers / account holders |

A platform user is one global KiteLedger account that may hold access to many
tenants. The mapping lives **only** in the central database — no tenant's local
`users` table carries a `tenant_id`, so database-per-tenant isolation is intact.

## Data model

```
central_users ──1:1── central_user_profiles
      │
      └──1:N── central_user_tenant_memberships ──N:1── tenants
                     role + 8 permission flags
central_user_invitations   (email, tenant, role, permissions, token_hash)
```

`central_user_tenant_memberships` is the important table:

* unique on `(central_user_id, tenant_id)` — no duplicate memberships;
* `role` — `owner`, `administrator`, `billing_manager`, `member`, `viewer`
  (`App\Enums\TenantMembershipRole`);
* explicit booleans `can_access_tenant`, `can_manage_users`, `can_manage_billing`,
  `can_manage_plan`, `can_view_invoices`, `can_make_payments`,
  `can_manage_company`, `can_manage_integrations`;
* `is_active`, `is_primary`, `invited_*`, `accepted_at`, `revoked_at`, `metadata`;
* optional informational `tenant_user_id` — never a cross-database foreign key.

The role seeds the flags; the flags are authoritative afterwards. Owners always
keep every flag so a tenant cannot end up with an owner who cannot administer it.

Index and constraint names are given explicitly (`cutm_*`) because the generated
names would exceed MySQL's 64-character identifier limit for this table name.

## Security model

1. `platform.user` (`EnsurePlatformUser`) — active account, not suspended, session
   not invalidated by a "sign out everywhere", forced password reset honoured.
2. `platform.tenant[:permission,…]` (`EnsurePlatformUserCanAccessTenant`) —
   resolves `{tenant}` through `CentralUser::accessibleTenants()` only. A tenant
   the signed-in user has no live membership for returns **403**, never data.
3. Policies — `Policies\Platform\{TenantPolicy, TenantBillingPolicy,
   TenantMembershipPolicy, CentralUserPolicy}`. Billing abilities are registered
   as `tenant-billing.*` gates so billing, plan, invoice and payment permissions
   stay independently enforceable.
4. Every billing query derives its `tenant_id` from the membership-resolved
   tenant. `Subscription::all()`-style queries never reach a platform user.

Ownership rules: a tenant must always retain at least one active owner, so the
last owner cannot be revoked, demoted or deactivated until ownership has been
transferred. Only one membership per user may be primary; revoking the primary
promotes another active membership (or clears it).

## Routes

Customer portal, central domain, prefix `/account` (names `central.account.*`):

```
/account/login  /account/logout  /account/forgot-password  /account/reset-password/{token}
/account/invitations/{token}
/account                              dashboard
/account/profile  /account/security
/account/tenants  /account/tenants/switch
/account/tenants/{tenant}             overview
/account/tenants/{tenant}/settings    company details      (can_manage_company to save)
/account/tenants/{tenant}/members     members + invites    (can_manage_users)
/account/tenants/{tenant}/billing     subscription/invoices/payments/usage (can_manage_billing)
/account/tenants/{tenant}/billing/plan[/cancel|/resume]    (can_manage_plan)
/account/tenants/{tenant}/billing/invoices/{invoice}/pay   (can_make_payments)
```

Control centre, under the configured admin path (`central.platform-users.*`):
list, show, create, update, profile, security actions, membership assign /
update / set-primary / revoke, and invitation create / revoke.

New central permissions: `platform-users.{view,create,update,suspend}`,
`tenant-memberships.{view,manage}`, `tenant-billing.{view,manage}`,
`tenant-plan.manage`.

## Invitations

No default password is ever created. An invitation stores only
`hash('sha256', $token)`; the raw token exists solely in the emailed link.
Accepting attaches the membership — and if the email already belongs to a
platform account, that account gains the tenant instead of being duplicated.

## Commands

```bash
php artisan migrate
php artisan db:seed --class=Database\\Seeders\\CentralRolesAndPermissionsSeeder
SAAS_SEED_DEMO_PLATFORM_USERS=true php artisan db:seed --class=Database\\Seeders\\CentralDatabaseSeeder
npm run build
php artisan test tests/Feature/SaaS/PlatformAccountTest.php
```
