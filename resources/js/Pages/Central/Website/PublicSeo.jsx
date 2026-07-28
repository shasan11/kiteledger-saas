import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function PublicSeo({ record = {}, site = {}, type = 'website', pageType, isPreview = false, title: suppliedTitle, description: suppliedDescription, canonical: suppliedCanonical, image: suppliedImage, schemas = [] }) {
    const consentEnabled = Boolean(site['website.cookie_consent_enabled']);
    const [analyticsAllowed, setAnalyticsAllowed] = useState(!consentEnabled);
    useEffect(() => {
        const refresh = (event) => setAnalyticsAllowed(!consentEnabled || (event?.detail || localStorage.getItem('kl-cookie-consent')) === 'all');
        refresh();
        window.addEventListener('kiteledger:consent', refresh);
        return () => window.removeEventListener('kiteledger:consent', refresh);
    }, [consentEnabled]);
    const siteTitle = site['seo.default_site_title'] || site['general.platform_name'] || 'KiteLedger';
    const rawTitle = suppliedTitle || record.seo_title || record.meta_title || record.title || siteTitle;
    const title = formatTitle(rawTitle, siteTitle, site);
    const description = suppliedDescription || record.meta_description || record.excerpt || record.description || site['seo.default_meta_description'] || '';
    const canonical = suppliedCanonical || record.canonical_url || canonicalFor(record, site, pageType);
    const image = suppliedImage || record.og_image || record.featured_media?.url || site['seo.default_open_graph_image'];
    const robotsIndex = isPreview ? false : (record.robots_index ?? site['seo.default_robots_index'] ?? true);
    const robotsFollow = isPreview ? false : (record.robots_follow ?? site['seo.default_robots_follow'] ?? true);
    const twitterImage = record.twitter_image || image;
    const rootDocument = typeof document === 'undefined' ? null : document;
    const locale = String(site['general.locale'] || rootDocument?.documentElement?.lang || 'en');
    const direction = String(site['general.direction'] || rootDocument?.documentElement?.dir || 'ltr') === 'rtl' ? 'rtl' : 'ltr';
    const pageSchema = schemaForPage(pageType, canonical, title, description);
    const parsedSchemas = uniqueSchemas([site['seo.organization_schema'], site['seo.website_schema'], ...schemas, record.schema_json, record.article_schema, pageSchema].map(parseSchema).filter(Boolean));
    const verificationCodes = parseKeyValue(site['seo.search_engine_verification_codes']);
    const twitterUsername = String(site['seo.x_twitter_username'] || '').trim();
    const analyticsId = validId(site['seo.google_analytics_id'], /^G-[A-Z0-9-]+$/i);
    const tagManagerId = validId(site['seo.google_tag_manager_id'], /^GTM-[A-Z0-9]+$/i);

    return <Head title={title}>
        <meta head-key="description" name="description" content={description}/>
        <meta head-key="robots" name="robots" content={`${robotsIndex ? 'index' : 'noindex'},${robotsFollow ? 'follow' : 'nofollow'}`}/>
        {canonical && <link head-key="canonical" rel="canonical" href={canonical}/>}
        <meta head-key="og:type" property="og:type" content={type}/>
        <meta head-key="content-language" httpEquiv="content-language" content={locale}/>
        <meta head-key="text-direction" name="direction" content={direction}/>
        <meta head-key="og:locale" property="og:locale" content={locale.replace('-', '_')}/>
        <meta head-key="og:title" property="og:title" content={record.og_title || title}/>
        <meta head-key="og:description" property="og:description" content={record.og_description || description}/>
        {canonical && <meta head-key="og:url" property="og:url" content={canonical}/>}
        {image && <meta head-key="og:image" property="og:image" content={image}/>}
        <meta head-key="twitter:card" name="twitter:card" content={site['seo.default_x_twitter_card'] || 'summary_large_image'}/>
        {twitterUsername && <meta head-key="twitter:site" name="twitter:site" content={twitterUsername.startsWith('@') ? twitterUsername : `@${twitterUsername}`}/>} 
        <meta head-key="twitter:title" name="twitter:title" content={record.twitter_title || record.og_title || title}/>
        <meta head-key="twitter:description" name="twitter:description" content={record.twitter_description || record.og_description || description}/>
        {twitterImage && <meta head-key="twitter:image" name="twitter:image" content={twitterImage}/>}
        {Object.entries(verificationCodes).map(([name, content]) => <meta key={name} head-key={`verification-${name}`} name={name} content={String(content)}/>)}
        {parsedSchemas.map((schema, index) => <script key={index} head-key={`schema-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(schema) }}/>) }
        {analyticsAllowed && analyticsId && (
            <script head-key="ga-loader" async src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}/>
        )}
        {analyticsAllowed && analyticsId && (
            <script head-key="ga-config" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}');` }}/>
        )}
        {analyticsAllowed && tagManagerId && (
            <script head-key="gtm-config" dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tagManagerId}');` }}/>
        )}
    </Head>;
}

function canonicalFor(record, site, pageType) {
    const base = String(site['seo.canonical_base_url'] || '').replace(/\/$/, '');
    if (!base) return undefined;
    if (pageType === 'blog') return `${base}/blog`;
    if (record.slug) return `${base}${record.slug === 'home' ? '/' : `/${record.slug}`}`;
    return undefined;
}

function schemaForPage(pageType, canonical, name, description) {
    const types = { about: 'AboutPage', contact: 'ContactPage', article: 'BlogPosting' };
    const schemaType = types[pageType];
    if (!schemaType || !canonical) return null;
    return { '@context': 'https://schema.org', '@type': schemaType, name, description: description || undefined, url: canonical };
}

function uniqueSchemas(schemas) {
    const seen = new Set();
    return schemas.filter((schema) => {
        const key = JSON.stringify([schema?.['@type'], schema?.url || schema?.['@id'] || schema?.headline || schema?.name]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parseSchema(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return null; }
}

function parseKeyValue(value) {
    const parsed = parseSchema(value);
    return parsed && !Array.isArray(parsed) ? parsed : {};
}

function safeJson(value) {
    return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function validId(value, pattern) {
    const id = String(value || '').trim();
    return pattern.test(id) ? id : null;
}

function formatTitle(rawTitle, siteTitle, site) {
    if (String(rawTitle).includes(siteTitle)) return rawTitle;
    const separator = site['seo.title_separator'] || '|';
    const template = site['seo.default_title_template'];
    if (!template) return `${rawTitle} ${separator} ${siteTitle}`;
    return String(template)
        .replaceAll('{title}', rawTitle).replaceAll('%title%', rawTitle)
        .replaceAll('{site_name}', siteTitle).replaceAll('%site_name%', siteTitle)
        .replaceAll('{separator}', separator).replaceAll('%separator%', separator);
}
