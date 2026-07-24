import { Head } from '@inertiajs/react';

export default function PublicSeo({ record = {}, site = {}, type = 'website', isPreview = false, title: suppliedTitle, description: suppliedDescription, canonical: suppliedCanonical, image: suppliedImage, schemas = [] }) {
    const siteTitle = site['seo.default_site_title'] || site['general.platform_name'] || 'KiteLedger';
    const rawTitle = suppliedTitle || record.seo_title || record.meta_title || record.title || siteTitle;
    const title = formatTitle(rawTitle, siteTitle, site);
    const description = suppliedDescription || record.meta_description || record.excerpt || record.description || site['seo.default_meta_description'] || '';
    const canonical = suppliedCanonical || record.canonical_url;
    const image = suppliedImage || record.og_image || record.featured_media?.url || site['seo.default_open_graph_image'];
    const robotsIndex = isPreview ? false : (record.robots_index ?? site['seo.default_robots_index'] ?? true);
    const robotsFollow = isPreview ? false : (record.robots_follow ?? site['seo.default_robots_follow'] ?? true);
    const twitterImage = record.twitter_image || image;
    const parsedSchemas = [site['seo.organization_schema'], site['seo.website_schema'], ...schemas, record.schema_json, record.article_schema].map(parseSchema).filter(Boolean);
    const verificationCodes = parseKeyValue(site['seo.search_engine_verification_codes']);
    const twitterUsername = String(site['seo.x_twitter_username'] || '').trim();
    const analyticsId = validId(site['seo.google_analytics_id'], /^G-[A-Z0-9-]+$/i);
    const tagManagerId = validId(site['seo.google_tag_manager_id'], /^GTM-[A-Z0-9]+$/i);

    return <Head title={title}>
        <meta head-key="description" name="description" content={description}/>
        <meta head-key="robots" name="robots" content={`${robotsIndex ? 'index' : 'noindex'},${robotsFollow ? 'follow' : 'nofollow'}`}/>
        {canonical && <link head-key="canonical" rel="canonical" href={canonical}/>}
        <meta head-key="og:type" property="og:type" content={type}/>
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
        {analyticsId && <script head-key="ga-loader" async src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}/>} 
        {analyticsId && <script head-key="ga-config" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}');` }}/>} 
        {tagManagerId && <script head-key="gtm-config" dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tagManagerId}');` }}/>} 
    </Head>;
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
    if (rawTitle === siteTitle) return rawTitle;
    const separator = site['seo.title_separator'] || '|';
    const template = site['seo.default_title_template'];
    if (!template) return `${rawTitle} ${separator} ${siteTitle}`;
    return String(template)
        .replaceAll('{title}', rawTitle).replaceAll('%title%', rawTitle)
        .replaceAll('{site_name}', siteTitle).replaceAll('%site_name%', siteTitle)
        .replaceAll('{separator}', separator).replaceAll('%separator%', separator);
}
