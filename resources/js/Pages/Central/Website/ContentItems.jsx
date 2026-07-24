import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import CentralLayout from '@/Layouts/CentralLayout';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

export default function ContentItems({ type, items, filters }) {
    const path = type === 'faq' ? 'faqs' : 'testimonials';
    const plural = type === 'faq' ? 'FAQs' : 'Testimonials';
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [form] = Form.useForm();
    const open = (item = null) => {
        setEditing(item || {});
        form.setFieldsValue(item ? { ...item, ...item.data, published_at: item.published_at ? dayjs(item.published_at) : null } : { status: 'draft', sort_order: 0, rating: type === 'testimonial' ? 5 : undefined });
    };
    const save = (values) => {
        const payload = { ...values, published_at: values.published_at?.toISOString() || null };
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        editing.id ? router.patch(route(`central.website-${path}.update`, editing.id), payload, options) : router.post(route(`central.website-${path}.store`), payload, options);
    };
    const remove = (item) => Modal.confirm({ title: `Delete ${type}?`, content: 'This content will be removed from the public website and moved to trash.', okText: 'Delete', okButtonProps: { danger: true }, onOk: () => router.delete(route(`central.website-${path}.destroy`, item.id), { preserveScroll: true }) });
    const apply = (extra) => router.get(window.location.pathname, { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const columns = [
        { title: type === 'faq' ? 'Question' : 'Attribution', render: (_, item) => <><Typography.Text strong>{item.title}</Typography.Text><br/><Typography.Text type="secondary">/{item.slug}</Typography.Text></> },
        { title: 'Content', dataIndex: 'content', ellipsis: true }, { title: 'Order', dataIndex: 'sort_order' },
        { title: 'Status', render: (_, item) => <StatusBadge value={item.status}/> },
        { title: '', width: 130, render: (_, item) => <Space><Button icon={<EditOutlined/>} onClick={() => open(item)}/><Button danger type="text" icon={<DeleteOutlined/>} onClick={() => remove(item)}/></Space> },
    ];

    return <CentralLayout title={plural}>
        <PageHeader eyebrow="Website" title={plural} description={`Edit, order, and publish every ${type === 'faq' ? 'answer' : 'customer quote'} shown on the public website.`} actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => open()}>New {type}</Button>}/>
        <SectionCard>
            <div className="central-toolbar"><Input.Search prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} allowClear/><Select allowClear value={filters.status} placeholder="Status" options={['draft', 'published', 'archived'].map((value) => ({ value, label: value }))} onChange={(status) => apply({ status, page: undefined })}/></div>
            <Table rowKey="id" dataSource={items.data} columns={columns} pagination={{ current: items.current_page, total: items.total, pageSize: items.per_page, onChange: (page) => apply({ page }), showSizeChanger: false }}/>
        </SectionCard>
        <Modal open={Boolean(editing)} title={`${editing?.id ? 'Edit' : 'Create'} ${type}`} width={760} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Save" destroyOnClose>
            <Form form={form} layout="vertical" onFinish={save}>
                <Form.Item name="title" label={type === 'faq' ? 'Question' : 'Display title'} rules={[{ required: true }]}><Input/></Form.Item>
                <Form.Item name="slug" label="Slug" rules={[{ required: true, pattern: /^[a-zA-Z0-9_-]+$/ }]}><Input/></Form.Item>
                <Form.Item name="content" label={type === 'faq' ? 'Answer' : 'Quote'} rules={[{ required: true }]}><Input.TextArea rows={6} maxLength={50000} showCount/></Form.Item>
                {type === 'testimonial' && <Space align="start" wrap><Form.Item name="attribution" label="Person"><Input/></Form.Item><Form.Item name="role" label="Role"><Input/></Form.Item><Form.Item name="company" label="Company"><Input/></Form.Item><Form.Item name="rating" label="Rating"><InputNumber min={1} max={5}/></Form.Item></Space>}
                <Space align="start" wrap><Form.Item name="status" label="Status" rules={[{ required: true }]}><Select style={{ width: 150 }} options={['draft', 'published', 'archived'].map((value) => ({ value, label: value }))}/></Form.Item><Form.Item name="published_at" label="Publish date"><DatePicker showTime/></Form.Item><Form.Item name="sort_order" label="Sort order" rules={[{ required: true }]}><InputNumber min={0}/></Form.Item></Space>
            </Form>
        </Modal>
    </CentralLayout>;
}
