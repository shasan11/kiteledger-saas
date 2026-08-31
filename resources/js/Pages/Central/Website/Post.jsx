import PublicSeo, { parseSchema } from "./PublicSeo";
import WebsiteLayout from "./components/WebsiteLayout";
import { Breadcrumbs, formatDate, WebsiteContainer, WebsiteImage, WebsiteLink } from "./components/WebsitePrimitives";

export default function Post({ post, related = [], menus = {}, site = {}, isPreview = false, announcements = [], navbarNotifications = [], websitePopup = null, socialLinks = [] }) {
    const title = post.seo_title || post.title;
    const description = post.meta_description || post.excerpt;
    const defaults = parseSchema(site["seo.article_schema_defaults"]) || {};
    const schema = post.article_schema || { ...defaults, "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description, datePublished: post.published_at, dateModified: post.updated_at, image: post.og_image || post.featured_media?.url, mainEntityOfPage: post.canonical_url };
    const categories = post.categories || [];
    const tags = post.tags || [];
    return <WebsiteLayout menus={menus} site={site} announcements={announcements} navbarNotifications={navbarNotifications} websitePopup={websitePopup} socialLinks={socialLinks} previewMessage={isPreview ? `Previewing ${post.status} post. This URL requires an authorized administrator.` : null}>
        <PublicSeo record={post} site={site} type="article" pageType="article" isPreview={isPreview} title={title} description={description} image={post.og_image || post.featured_media?.url} schemas={post.article_schema ? [] : [schema]} />
        <article className="kl-post">
            <WebsiteContainer className="kl-post-header">
                <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
                <div className="kl-post-taxonomy">{categories.map((category) => <WebsiteLink key={category.id} href={typeof route === "function" ? route("central.blog.category", category.slug) : `/blog/category/${category.slug}`}>{category.name}</WebsiteLink>)}</div>
                <h1>{post.title}</h1>
                {post.excerpt && <p className="kl-lead">{post.excerpt}</p>}
                <div className="kl-post-meta">{post.published_at && <time dateTime={post.published_at}>Published {formatDate(post.published_at)}</time>}{post.updated_at && post.updated_at !== post.published_at && <time dateTime={post.updated_at}>Updated {formatDate(post.updated_at)}</time>}{post.reading_time && <span>{post.reading_time} min read</span>}</div>
            </WebsiteContainer>
            {post.featured_media?.url && <WebsiteContainer className="kl-post-hero"><WebsiteImage src={post.featured_media.url} alt={post.featured_image_alt || post.title} width={post.featured_media.width} height={post.featured_media.height} fit="cover" loading="eager" fetchPriority="high" /></WebsiteContainer>}
            <WebsiteContainer className="kl-post-body"><div className="kl-prose" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
                {tags.length > 0 && <footer className="kl-post-tags" aria-label="Article tags">{tags.map((tag) => <WebsiteLink key={tag.id} href={typeof route === "function" ? route("central.blog.tag", tag.slug) : `/blog/tag/${tag.slug}`}>#{tag.name}</WebsiteLink>)}</footer>}
            </WebsiteContainer>
        </article>
        {related.length > 0 && <section className="kl-section kl-related"><WebsiteContainer><header className="kl-section-header"><h2>Related articles</h2></header><div className="kl-related-grid">{related.map((item) => <article key={item.id}><h3><WebsiteLink href={typeof route === "function" ? route("central.blog.post", item.slug) : `/blog/${item.slug}`}>{item.title}</WebsiteLink></h3>{item.excerpt && <p>{item.excerpt}</p>}</article>)}</div></WebsiteContainer></section>}
    </WebsiteLayout>;
}
