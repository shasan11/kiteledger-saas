export const sectionRegistry = [
    ['general', 'General', 'core', 'Core platform defaults', ['platform', 'defaults']],
    ['branding', 'Branding', 'core', 'Logos, colors, and product identity', ['logo', 'theme']],
    ['website', 'Public Website', 'core', 'Website availability, maintenance notice, and cookie consent', ['maintenance', 'cookie']],
    ['company', 'Company', 'core', 'Organization identity and contact details', ['address', 'contact']],
    ['tenant_registration', 'Tenant Registration', 'core', 'Customer signup and workspace defaults', ['signup', 'onboarding']],
    ['domains', 'Domains', 'core', 'Tenant hostnames and domain policy', ['hostname', 'subdomain']],
    ['billing', 'Billing', 'core', 'Invoices, prices, tax, and billing defaults', ['invoice', 'tax']],
    ['subscriptions', 'Subscriptions', 'core', 'Subscription lifecycle and access', ['plans', 'renewal']],
    ['trials', 'Trials', 'core', 'Trial periods and conversion policy', ['evaluation']],
    ['invoice_customization', 'Invoice Customization', 'core', 'Invoice appearance and content', ['pdf']],
    ['email', 'Email', 'operations', 'Outbound email delivery and sender details', ['smtp', 'mailer']],
    ['communication', 'Marketing Communication', 'operations', 'SMS provider and campaign delivery defaults', ['twilio', 'campaign']],
    ['notifications', 'Notifications', 'operations', 'Administrative alerts and delivery channels', ['alerts', 'webhook']],
    ['storage', 'Storage', 'operations', 'File storage and retention', ['files', 'disk']],
    ['queue_scheduler', 'Queue & Scheduler', 'operations', 'Background jobs and scheduled work', ['cron', 'jobs']],
    ['support', 'Support', 'operations', 'Customer support workflow defaults', ['tickets', 'sla']],
    ['monitoring', 'Monitoring', 'operations', 'Health and operational monitoring', ['health', 'uptime']],
    ['security', 'Security', 'access', 'Passwords, sessions, and access controls', ['password', 'session']],
    ['privacy', 'Privacy & Compliance', 'access', 'Privacy, retention, and compliance', ['gdpr', 'consent']],
    ['seo', 'SEO', 'discovery', 'Search-engine discovery settings', ['robots', 'metadata']],
    ['analytics', 'Analytics', 'discovery', 'Analytics and measurement integrations', ['tracking']],
    ['api', 'API & Webhooks', 'discovery', 'API access and webhook behavior', ['developer', 'integration']],
    ['database_pool', 'Database Pool', 'advanced', 'Pre-created tenant database capacity', ['database', 'allocation']],
    ['provisioning', 'Provisioning', 'advanced', 'Tenant provisioning behavior', ['tenant', 'database']],
    ['usage', 'Usage', 'advanced', 'Usage collection and limits', ['quota', 'metrics']],
].map(([key, label, category, description, keywords], order) => ({ key, label, category, description, keywords, order }));

export const categoryLabels = { core: 'Core', operations: 'Communication & Operations', access: 'Access & Compliance', discovery: 'Discovery & Integrations', advanced: 'Advanced' };

export function orderedSections(groups) {
    const known = new Map(sectionRegistry.map((item) => [item.key, item]));
    return Object.keys(groups).map((key, index) => known.get(key) || {
        key, label: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        category: 'advanced', description: `Manage ${key.replaceAll('_', ' ')} settings.`, keywords: [], order: sectionRegistry.length + index,
    }).sort((a, b) => a.order - b.order);
}

export function sectionMatches(item, settings, term) {
    const query = term.trim().toLowerCase();
    if (!query) return true;
    return [item.key, item.label, item.description, ...(item.keywords || []), ...settings.flatMap((setting) => [setting.key, setting.label, setting.description, setting.help_text])]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
}
