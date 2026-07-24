import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { CopyOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, DatePicker, Drawer, Form, Input, Modal, Select, Space, Table } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

export default function BlogIndex({ posts, categories, tags, authors, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [selected, setSelected] = useState([]);
    const [quick, setQuick] = useState(null);
    const [form] = Form.useForm();
    const apply = (extra) => router.get(route('central.blog.index'), { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const bulk = (action) => { const run = () => router.post(route('central.blog.bulk'), { ids: selected, action }, { onSuccess: () => setSelected([]) }); action === 'delete' ? Modal.confirm({ title: `Delete ${selected.length} posts?`, okText: 'Move to trash', okButtonProps: { danger: true }, onOk: run }) : run(); };
    const quickEdit = (post) => { setQuick(post); form.setFieldsValue({ title: post.title, status: post.status, published_at: post.published_at ? dayjs(post.published_at) : null, scheduled_at: post.scheduled_at ? dayjs(post.scheduled_at) : null }); };
    const quickSave = (values) => router.patch(route('central.blog.quick-update', quick.id), { ...values, published_at: values.published_at?.toISOString() || null, scheduled_at: values.scheduled_at?.toISOString() || null }, { onSuccess: () => setQuick(null) });
    const dateRange = filters.published_from ? [dayjs(filters.published_from), dayjs(filters.published_to || filters.published_from)] : null;
    const columns = [
        { title: 'Title', key: 'title', render: (_, row) => <><strong>{row.title}</strong><br/><span className="central-muted">/blog/{row.slug}</span></> },
        { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value}/> },
        { title: 'Author', render: (_, row) => row.author?.name || 'System' },
        { title: 'Categories', render: (_, row) => row.categories?.map((item) => item.name).join(', ') || '—' },
        { title: 'Tags', render: (_, row) => row.tags?.map((item) => item.name).join(', ') || '—' },
        { title: 'Published', render: (_, row) => formatDate(row.published_at, true) },
        { title: 'Updated', render: (_, row) => formatDate(row.updated_at, true) },
        { title: '', width: 210, render: (_, row) => <Space><Button icon={<EyeOutlined/>} onClick={() => window.open(route('central.blog.preview', row.id), '_blank', 'noopener,noreferrer')}/><Button icon={<EditOutlined/>} onClick={() => quickEdit(row)}>Quick edit</Button><Button icon={<CopyOutlined/>} onClick={() => router.post(route('central.blog.duplicate', row.id))}/><Button onClick={() => router.visit(route('central.blog.edit', row.id))}>Editor</Button></Space> },
    ];
    return <CentralLayout title="Blog Posts"><PageHeader eyebrow="Website" title="Blog Posts" description="Write, review, schedule, publish, preview, duplicate, and organize search-ready editorial content." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => router.visit(route('central.blog.create'))}>New post</Button>}/><SectionCard><div className="central-toolbar"><Input.Search prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} allowClear placeholder="Search title or slug"/><Select allowClear placeholder="Status" value={filters.status || undefined} onChange={(status) => apply({ status, page: undefined })} options={['draft', 'review', 'scheduled', 'published', 'archived'].map((value) => ({ value, label: value }))}/><Select allowClear placeholder="Category" value={filters.category_id ? Number(filters.category_id) : undefined} onChange={(category_id) => apply({ category_id, page: undefined })} options={categories.map((item) => ({ value: item.id, label: item.name }))}/><Select allowClear placeholder="Tag" value={filters.tag_id ? Number(filters.tag_id) : undefined} onChange={(tag_id) => apply({ tag_id, page: undefined })} options={tags.map((item) => ({ value: item.id, label: item.name }))}/><Select allowClear placeholder="Author" value={filters.author_id ? Number(filters.author_id) : undefined} onChange={(author_id) => apply({ author_id, page: undefined })} options={authors.map((item) => ({ value: item.id, label: item.name }))}/><DatePicker.RangePicker value={dateRange} onChange={(dates) => apply({ published_from: dates?.[0]?.format('YYYY-MM-DD'), published_to: dates?.[1]?.format('YYYY-MM-DD'), page: undefined })}/></div>{selected.length > 0 && <Space style={{ marginBottom: 14 }}><span>{selected.length} selected</span><Button onClick={() => bulk('publish')}>Publish</Button><Button onClick={() => bulk('archive')}>Archive</Button><Button danger onClick={() => bulk('delete')}>Delete</Button></Space>}<Table rowKey="id" rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} dataSource={posts.data} columns={columns} scroll={{ x: 1200 }} pagination={{ current: posts.current_page, total: posts.total, pageSize: posts.per_page, onChange: (page) => apply({ page }), showSizeChanger: false }}/></SectionCard><Drawer open={Boolean(quick)} onClose={() => setQuick(null)} width={480} title="Quick edit post" extra={<Button type="primary" onClick={() => form.submit()}>Save</Button>}><Form form={form} layout="vertical" onFinish={quickSave}><Form.Item name="title" label="Title" rules={[{ required: true }]}><Input/></Form.Item><Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={['draft', 'review', 'scheduled', 'published', 'archived'].map((value) => ({ value, label: value }))}/></Form.Item><Form.Item noStyle shouldUpdate={(before, after) => before.status !== after.status}>{({ getFieldValue }) => getFieldValue('status') === 'scheduled' && <Form.Item name="scheduled_at" label="Scheduled date" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }}/></Form.Item>}</Form.Item><Form.Item name="published_at" label="Published date"><DatePicker showTime style={{ width: '100%' }}/></Form.Item></Form></Drawer></CentralLayout>;
}
