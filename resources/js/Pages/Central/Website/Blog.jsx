import { Link, router } from '@inertiajs/react';
import { Card, Col, Empty, List, Pagination, Row, Typography } from 'antd';
import { PublicFooter, PublicHeader } from './Page';
import PublicSeo from './PublicSeo';

export default function Blog({ posts, featured = [], recent = [], archive, menus, site }) {
    const entity = archive?.category || archive?.tag;
    const title = entity?.name || 'Blog';
    const description = entity?.meta_description || entity?.description || 'Guides and product updates from KiteLedger.';
    const canonical = entity?.canonical_url || `${String(site['seo.canonical_base_url'] || '').replace(/\/$/, '')}${entity ? `/blog/${archive.category ? 'category' : 'tag'}/${entity.slug}` : '/blog'}`;

    return <>
        <PublicSeo record={entity || {}} site={site} title={entity?.seo_title || title} description={description} canonical={canonical}/>
        <PublicHeader menus={menus} site={site}/>
        <main style={{ padding: '64px 6vw' }}>
            <Typography.Title>{title}</Typography.Title>
            <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
            {!entity && featured.length > 0 && <Row gutter={[20, 20]} style={{ marginBottom: 36 }}>{featured.map((post) => <Col xs={24} md={8} key={post.id}><Card cover={post.featured_media && <img src={post.featured_media.url} alt={post.featured_image_alt || ''}/>} title={<Link href={route('central.blog.post', post.slug)}>{post.title}</Link>}><p>{post.excerpt}</p></Card></Col>)}</Row>}
            <Row gutter={[28, 28]}>
                <Col xs={24} lg={17}>
                    {posts.data.length ? <Row gutter={[20, 20]}>{posts.data.map((post) => <Col xs={24} md={12} key={post.id}><Card cover={post.featured_media && <img src={post.featured_media.url} alt={post.featured_image_alt || ''}/>} title={<Link href={route('central.blog.post', post.slug)}>{post.title}</Link>}><p>{post.excerpt}</p><Typography.Text type="secondary">{post.reading_time} min read</Typography.Text></Card></Col>)}</Row> : <Empty description="No published posts"/>}
                    <Pagination style={{ marginTop: 28 }} current={posts.current_page} total={posts.total} pageSize={posts.per_page} onChange={(page) => router.get(window.location.pathname, { page })}/>
                </Col>
                <Col xs={24} lg={7}><Card title="Recent posts"><List dataSource={recent} renderItem={(post) => <List.Item><Link href={route('central.blog.post', post.slug)}>{post.title}</Link></List.Item>}/></Card></Col>
            </Row>
        </main>
        <PublicFooter menus={menus} site={site}/>
    </>;
}
