import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import CentralLayout from '@/Layouts/CentralLayout';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Form, Image, Input, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';

export default function Taxonomies({ type, items, filters, categories, media }) {
    const singular = type === 'categories' ? 'category' : 'tag';
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [form] = Form.useForm();
    const open = (item = null) => { setEditing(item || {}); form.setFieldsValue(item ? { ...item } : { status: 'active', sort_order: 0 }); };
    const submit = (values) => editing.id
        ? router.patch(route(`central.blog-${type}.update`, editing.id), values, { preserveScroll: true, onSuccess: () => setEditing(null) })
        : router.post(route(`central.blog-${type}.store`), values, { preserveScroll: true, onSuccess: () => setEditing(null) });
    const remove = (item) => Modal.confirm({ title: `Delete ${singular}?`, content: item.posts_count ? `${item.posts_count} post associations will remain recoverable while this record is soft deleted.` : 'This record will be moved to trash.', okText: 'Delete', okButtonProps: { danger: true }, onOk: () => router.delete(route(`central.blog-${type}.destroy`, item.id), { preserveScroll: true }) });
    const columns = [
        { title: 'Name', render: (_, item) => <><Typography.Text strong>{item.name}</Typography.Text><br/><Typography.Text type="secondary">/{item.slug}</Typography.Text></> },
        ...(type === 'categories' ? [{ title: 'Parent', render: (_, item) => item.parent?.name || 'Top level' }, { title: 'Order', dataIndex: 'sort_order' }] : []),
        { title: 'Posts', dataIndex: 'posts_count' }, { title: 'Status', render: (_, item) => <StatusBadge value={item.status}/> },
        { title: '', width: 140, render: (_, item) => <Space><Button icon={<EditOutlined/>} onClick={() => open(item)}/><Button danger type="text" icon={<DeleteOutlined/>} onClick={() => remove(item)}/></Space> },
    ];
    return <CentralLayout title={`Blog ${type}`}>
        <PageHeader eyebrow="Website · Blog" title={`Blog ${type}`} description={`Manage reusable ${type}, publication state, and ${type === 'categories' ? 'hierarchy and search metadata' : 'post associations'}.`} actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => open()}>New {singular}</Button>}/>
        <SectionCard><div className="central-toolbar"><Input.Search prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => router.get(window.location.pathname, { ...filters, search }, { preserveState: true })} allowClear/><Select allowClear value={filters.status} placeholder="Status" options={['active', 'inactive'].map((value) => ({ value, label: value }))} onChange={(status) => router.get(window.location.pathname, { ...filters, status }, { preserveState: true })}/></div><Table rowKey="id" dataSource={items.data} columns={columns} pagination={{ current: items.current_page, total: items.total, pageSize: items.per_page, onChange: (page) => router.get(window.location.pathname, { ...filters, page }), showSizeChanger: false }}/></SectionCard>
        <Modal open={Boolean(editing)} title={`${editing?.id ? 'Edit' : 'Create'} ${singular}`} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Save" destroyOnClose width={680}><Form form={form} layout="vertical" onFinish={submit}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input/></Form.Item><Form.Item name="slug" label="Slug" rules={[{ required: true, pattern: /^[a-zA-Z0-9_-]+$/, message: 'Use letters, numbers, dashes, and underscores.' }]}><Input/></Form.Item><Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item>{type === 'categories' && <><Form.Item name="parent_id" label="Parent category"><Select allowClear options={categories.filter((item) => item.id !== editing?.id).map((item) => ({ value: item.id, label: item.name }))}/></Form.Item><Form.Item name="media_id" label="Category image"><Select allowClear showSearch optionFilterProp="label" options={media.map((item) => ({ value: item.id, label: item.filename }))} optionRender={(option) => <Space><Image preview={false} width={32} height={24} style={{ objectFit: 'cover' }} src={media.find((item) => item.id === option.value)?.url}/>{option.label}</Space>}/></Form.Item><Form.Item name="seo_title" label="SEO title"><Input/></Form.Item><Form.Item name="meta_description" label="Meta description"><Input.TextArea rows={2} maxLength={320} showCount/></Form.Item><Form.Item name="canonical_url" label="Canonical URL"><Input type="url"/></Form.Item><Form.Item name="sort_order" label="Sort order" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }}/></Form.Item></>}<Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={['active', 'inactive'].map((value) => ({ value, label: value }))}/></Form.Item></Form></Modal>
    </CentralLayout>;
}
