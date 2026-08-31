import { Head } from '@inertiajs/react';
import WebsiteLayout from './components/WebsiteLayout';
import { WebsiteContainer, WebsiteLink } from './components/WebsitePrimitives';
export default function ResourceArticle({ article, ...layout }) { return <WebsiteLayout {...layout}><Head title={article.seo_title || article.title}><meta name="description" content={article.meta_description || article.excerpt || ''}/></Head><WebsiteContainer as="article" className="kl-resource-article"><WebsiteLink href="/resources">← All resources</WebsiteLink><p>{article.category?.name}</p><h1>{article.title}</h1><p className="kl-lede">{article.excerpt}</p><div className="kl-prose" dangerouslySetInnerHTML={{__html:article.body}}/></WebsiteContainer></WebsiteLayout>; }
