# Public website and mini CMS

KiteLedger's public site is rendered from central-database content. Super administrators can manage pages, reusable sections, navigation, announcements, FAQs, testimonials, integrations, solutions, media, SEO, branding, and inbound leads from the **Website** area.

## Publishing workflow

1. Create or edit a page and keep it in `draft` while composing it.
2. Add and order page sections in **Website → Sections**. Section data is validated against the supported component types.
3. Use **Preview** to inspect unpublished work. Preview URLs require an authenticated central administrator and are marked `noindex`.
4. Publish immediately or schedule the page. Public queries exclude drafts, private records, and future content.
5. Every page save creates a revision. Use the page's **Revisions** tab to restore an earlier snapshot; the current state is preserved as another revision first.

Public page, menu, sitemap, and reusable-content caches are invalidated automatically when their source records change. Only arrays are stored in the public website cache, so deployments cannot leave serialized Eloquent objects whose PHP class is unavailable during cache hydration.

## Branding and media

Manage colors, logo variants, favicon, footer copy, and public CTA defaults under **Website → Website Branding**. Uploaded assets live in the central media library. Image metadata includes title, alt text, and caption. SVG uploads containing scripts, event handlers, embedded executable elements, or external resources are rejected.

Media that is still referenced as a page hero, blog image, or section image cannot be deleted. Replace the reference first, then delete the old asset.

## Structured content

Sections are reusable presentation components rather than repeated hardcoded homepage markup. Supported types include hero, logos, feature grids, product showcases, statistics, solutions, integrations, security, pricing, testimonials, FAQ, calls to action, newsletter, and footer content. The initial `WebsiteSeeder` supplies polished copy and structured examples; rerunning it updates the KiteLedger-owned baseline records without creating duplicates.

Additional content records expose a JSON settings field for type-specific presentation data such as icons, links, images, announcement schedules, dismissal behavior, and styles. Public text is escaped by React; rich page and section HTML passes through the server-side sanitizer before storage.

## Leads

The contact page sends validated, rate-limited requests to the central database. A honeypot reduces automated submissions, consent is required, and only a one-way hash of the request IP is retained. Administrators can review status in **Website → Website Leads** and export a CSV for approved operational use.

## Seed commands

Seed or refresh only the public website baseline:

```bash
php artisan db:seed --class=WebsiteSeeder --force
```

Seed demo business records into one existing tenant (recommended for SaaS installations):

```bash
php artisan kiteledger:seed-demo --tenant=TENANT_ID --profile=quick
```

Use `--profile=full --force` only for a dedicated demo tenant; the full dataset is intentionally much larger. Omitting `--tenant` preserves the legacy single-database behavior and seeds the current database connection.

## Upgrade an existing installation

Back up the central database, tenant databases, `.env`, and uploaded files first. After deploying the merged code, run:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan tenants:migrate --force
php artisan db:seed --class=CentralRolesAndPermissionsSeeder --force
php artisan db:seed --class=PlatformSettingsSeeder --force
php artisan db:seed --class=WebsiteSeeder --force
npm ci
npm run build
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Do not run a demo seeder against a live customer tenant. Demo seeding is opt-in and separate from migrations and website baseline seeding.
