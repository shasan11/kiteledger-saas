import { router } from "@inertiajs/react";
import PublicSeo from "./PublicSeo";
import WebsiteLayout from "./components/WebsiteLayout";
import { Breadcrumbs, formatDate, WebsiteContainer, WebsiteImage, WebsiteLink } from "./components/WebsitePrimitives";

function PostCard({ post, featured = false }) {
    const href = typeof route === "function" ? route("central.blog.post", post.slug) : `/blog/${post.slug}`;
    return <article className={`kl-post-card${featured ? " kl-post-card--featured" : ""}`}>
        {post.featured_media?.url && <WebsiteLink href={href} className="kl-post-card__media"><WebsiteImage src={post.featured_media.url} alt={post.featured_image_alt || post.title} width={post.featured_media.width} height={post.featured_media.height} fit="cover" /></WebsiteLink>}
        <div className="kl-post-card__body">
            <div className="kl-post-meta">{formatDate(post.published_at) && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}{post.reading_time && <span>{post.reading_time} min read</span>}</div>
            <h2><WebsiteLink href={href}>{post.title}</WebsiteLink></h2>
            {post.excerpt && <p>{post.excerpt}</p>}
            <WebsiteLink className="kl-text-link" href={href}>Read article <span aria-hidden="true">→</span></WebsiteLink>
        </div>
    </article>;
}

export default function Blog({ posts = { data: [] }, featured = [], recent = [], archive, menus = {}, site = {}, announcements = [], navbarNotifications = [], websitePopup = null, socialLinks = [] }) {
    const entity = archive?.category || archive?.tag;
    const title = entity?.name || "Blog";
    const description = entity?.meta_description || entity?.description || site["blog.description"] || "Guides and product updates from KiteLedger.";
    const base = String(site["seo.canonical_base_url"] || "").replace(/\/$/, "");
    const canonical = entity?.canonical_url || `${base}${entity ? `/blog/${archive.category ? "category" : "tag"}/${entity.slug}` : "/blog"}`;
    const featuredPost = !entity ? featured[0] : null;
    const articles = (posts.data || []).filter((post) => post.id !== featuredPost?.id);
    return <WebsiteLayout menus={menus} site={site} announcements={announcements} navbarNotifications={navbarNotifications} websitePopup={websitePopup} socialLinks={socialLinks}>
        <PublicSeo record={entity || {}} site={site} title={entity?.seo_title || title} description={description} canonical={canonical} pageType="blog" />
        <section className="kl-page-header kl-page-header--compact"><WebsiteContainer><Breadcrumbs items={entity ? [{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: title }] : [{ label: "Home", href: "/" }, { label: "Blog" }]} /><header className="kl-section-header"><p className="kl-eyebrow">Insights</p><h1>{title}</h1><p>{description}</p></header></WebsiteContainer></section>
        <WebsiteContainer className="kl-blog-layout">
            <div>
                {featuredPost && <section className="kl-featured-post" aria-labelledby="featured-post-heading"><p className="kl-eyebrow" id="featured-post-heading">Featured article</p><PostCard post={featuredPost} featured /></section>}
                {articles.length ? <section className="kl-post-list" aria-label="Articles">{articles.map((post) => <PostCard key={post.id} post={post} />)}</section> : <div className="kl-empty-state"><h2>No articles found</h2><p>There are no published articles in this collection yet.</p></div>}
                {(posts.last_page || 1) > 1 && <nav className="kl-pagination" aria-label="Blog pagination"><button type="button" disabled={posts.current_page <= 1} onClick={() => router.get(window.location.pathname, { page: posts.current_page - 1 }, { preserveScroll: true })}>Previous</button><span>Page {posts.current_page} of {posts.last_page}</span><button type="button" disabled={posts.current_page >= posts.last_page} onClick={() => router.get(window.location.pathname, { page: posts.current_page + 1 }, { preserveScroll: true })}>Next</button></nav>}
            </div>
            {recent.length > 0 && <aside className="kl-recent-posts"><h2>Recent articles</h2><ol>{recent.map((post) => <li key={post.id}><WebsiteLink href={typeof route === "function" ? route("central.blog.post", post.slug) : `/blog/${post.slug}`}>{post.title}</WebsiteLink>{post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}</li>)}</ol></aside>}
        </WebsiteContainer>
    </WebsiteLayout>;
}
