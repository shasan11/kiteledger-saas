import { Link } from '@inertiajs/react';
import { Alert, Card, Col, Row, Tag, Typography } from 'antd';
import { PublicFooter, PublicHeader } from './Page';
import PublicSeo, { parseSchema } from './PublicSeo';

export default function Post({ post, related = [], menus, site, isPreview = false }) {
    const title = post.seo_title || post.title;
    const description = post.meta_description || post.excerpt;
    const defaults = parseSchema(site?.['seo.article_schema_defaults']) || {};
    const schema = post.article_schema || { ...defaults, '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description, datePublished: post.published_at, dateModified: post.updated_at, image: post.og_image || post.featured_media?.url };

    return <>
        <PublicSeo record={post} site={site} type="article" isPreview={isPreview} title={title} description={description} image={post.og_image || post.featured_media?.url} schemas={post.article_schema ? [] : [schema]}/>
        {isPreview && <Alert banner type="warning" showIcon message={`Previewing ${post.status} post. This URL requires an authorized administrator.`}/>} 
        <PublicHeader menus={menus} site={site}/>
        <article style={{ maxWidth: 860, margin: '64px auto', padding: '0 24px' }}>
            <Typography.Title>{post.title}</Typography.Title>
            <Typography.Paragraph type="secondary">{post.reading_time} min read</Typography.Paragraph>
            <div>{post.categories.map((category) => <Link key={category.id} href={route('central.blog.category', category.slug)}><Tag>{category.name}</Tag></Link>)}{post.tags.map((tag) => <Link key={tag.id} href={route('central.blog.tag', tag.slug)}><Tag>#{tag.name}</Tag></Link>)}</div>
            {post.featured_media && <img src={post.featured_media.url} alt={post.featured_image_alt || ''} style={{ width: '100%', margin: '28px 0', borderRadius: 14 }}/>} 
            <div className="public-rich-content" dangerouslySetInnerHTML={{ __html: post.content || '' }}/>
        </article>
        {related.length > 0 && <section style={{ padding: '48px 6vw' }}><Typography.Title level={2}>Related posts</Typography.Title><Row gutter={[18, 18]}>{related.map((item) => <Col xs={24} md={8} key={item.id}><Card title={<Link href={route('central.blog.post', item.slug)}>{item.title}</Link>}>{item.excerpt}</Card></Col>)}</Row></section>}
        <PublicFooter menus={menus} site={site}/>
    </>;
}
