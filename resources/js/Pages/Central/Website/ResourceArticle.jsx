import PublicSeo from './PublicSeo';
import WebsiteLayout from './components/WebsiteLayout';
import { Breadcrumbs, formatDate, WebsiteContainer, WebsiteImage, WebsiteLink } from './components/WebsitePrimitives';

export default function ResourceArticle({ article, site = {}, ...layout }) {
    const published = formatDate(article.published_at);
    const updated = article.updated_at !== article.published_at ? formatDate(article.updated_at) : '';
    const gallery = (article.gallery || []).filter((item) => item?.url && item.id !== article.featured_media?.id);
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: article.title,
        description: article.meta_description || article.excerpt,
        datePublished: article.published_at,
        dateModified: article.updated_at,
        image: article.og_image || article.featured_media?.url,
        mainEntityOfPage: article.canonical_url,
    };

    return <WebsiteLayout {...layout} site={site}>
        <PublicSeo record={article} site={site} type="article" pageType="article" title={article.seo_title || article.title} description={article.meta_description || article.excerpt} image={article.og_image || article.featured_media?.url} schemas={[schema]}/>
        <article className="kl-resource-article-page">
            <WebsiteContainer className="kl-resource-article">
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/resources' }, { label: article.title }]}/>
                <div className="kl-resource-article__meta">
                    {article.category?.name && <WebsiteLink href={`/resources?category=${article.category.slug}`}>{article.category.name}</WebsiteLink>}
                    {published && <time dateTime={article.published_at}>Published {published}</time>}
                    {updated && <time dateTime={article.updated_at}>Updated {updated}</time>}
                </div>
                <h1>{article.title}</h1>
                {article.excerpt && <p className="kl-lead">{article.excerpt}</p>}
            </WebsiteContainer>
            {article.featured_media?.url && <WebsiteContainer className="kl-resource-article__hero"><WebsiteImage src={article.featured_media.url} alt={article.featured_media.alt_text || article.title} width={article.featured_media.width} height={article.featured_media.height} fit="cover" loading="eager" fetchPriority="high"/></WebsiteContainer>}
            <WebsiteContainer className="kl-resource-article__body">
                <div className="kl-prose" dangerouslySetInnerHTML={{ __html: article.body || '' }}/>
                {gallery.length > 0 && <section className="kl-resource-gallery" aria-label="Resource gallery">{gallery.map((item) => <WebsiteImage key={item.id} src={item.url} alt={item.alt_text || item.title || article.title} width={item.width} height={item.height} fit="cover"/>)}</section>}
                <footer className="kl-resource-article__footer"><WebsiteLink className="kl-text-link" href="/resources">Back to resources</WebsiteLink></footer>
            </WebsiteContainer>
        </article>
    </WebsiteLayout>;
}
