import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import CentralLayout from '@/Layouts/CentralLayout';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';

const types = ['boolean', 'integer', 'decimal', 'string', 'json'];
export default function FeatureIndex({ features, categories, filters }) {
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [form] = Form.useForm();
    const type = Form.useWatch('type', form);
    const open = (feature = null) => { setEditing(feature || {}); form.setFieldsValue(feature ? { ...feature, default_value: typeof feature.default_value === 'object' ? JSON.stringify(feature.default_value, null, 2) : feature.default_value } : { category: 'general', type: 'boolean', default_value: false, is_active: true, is_visible: true, is_billable: false, sort_order: 0 }); };
    const save = (values) => editing.id ? router.patch(route('central.features.update', editing.id), values, { preserveScroll: true, onSuccess: () => setEditing(null) }) : router.post(route('central.features.store'), values, { preserveScroll: true, onSuccess: () => setEditing(null) });
    const remove = (feature) => Modal.confirm({ title: `Delete ${feature.name}?`, content: 'Deletion is blocked while plans or tenant overrides reference this feature.', okText: 'Delete', okButtonProps: { danger: true }, onOk: () => router.delete(route('central.features.destroy', feature.id), { preserveScroll: true }) });
    const apply = (extra) => router.get(window.location.pathname, { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const columns = [
        { title: 'Feature', render: (_, item) => <><Typography.Text strong>{item.name}</Typography.Text><br/><Typography.Text type="secondary">{item.key}</Typography.Text></> },
        { title: 'Category', dataIndex: 'category' }, { title: 'Type', dataIndex: 'type' },
        { title: 'Default', render: (_, item) => <Typography.Text code>{typeof item.default_value === 'object' ? JSON.stringify(item.default_value) : String(item.default_value ?? '—')}</Typography.Text> },
        { title: 'Plans', dataIndex: 'plans_count' }, { title: 'Status', render: (_, item) => <StatusBadge value={item.is_active ? 'active' : 'inactive'}/> },
        { title: '', width: 130, render: (_, item) => <Space><Button icon={<EditOutlined/>} onClick={() => open(item)}/><Button danger type="text" icon={<DeleteOutlined/>} onClick={() => remove(item)}/></Space> },
    ];
    return <CentralLayout title="Feature Catalog">
        <PageHeader eyebrow="Product" title="Feature Catalog" description="Define typed capabilities and limits shared by plan pricing and tenant-specific overrides." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => open()}>New feature</Button>}/>
        <SectionCard><div className="central-toolbar"><Input.Search prefix={<SearchOutlined/>} value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} allowClear/><Select allowClear value={filters.category} placeholder="Category" options={categories.map((value) => ({ value, label: value }))} onChange={(category) => apply({ category, page: undefined })}/><Select allowClear value={filters.type} placeholder="Type" options={types.map((value) => ({ value, label: value }))} onChange={(value) => apply({ type: value, page: undefined })}/><Select allowClear value={filters.status} placeholder="Status" options={['active', 'inactive'].map((value) => ({ value, label: value }))} onChange={(status) => apply({ status, page: undefined })}/></div><Table rowKey="id" dataSource={features.data} columns={columns} pagination={{ current: features.current_page, total: features.total, pageSize: features.per_page, onChange: (page) => apply({ page }), showSizeChanger: false }}/></SectionCard>
        <Modal open={Boolean(editing)} title={`${editing?.id ? 'Edit' : 'Create'} feature`} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Save feature" width={700} destroyOnClose><Form form={form} layout="vertical" onFinish={save}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input/></Form.Item><Form.Item name="key" label="Key" rules={[{ required: true, pattern: /^[a-zA-Z0-9_-]+$/ }]}><Input/></Form.Item><Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item><Space align="start" style={{ width: '100%' }} wrap><Form.Item name="category" label="Category" rules={[{ required: true }]}><Select showSearch mode="tags" maxCount={1} style={{ minWidth: 200 }} options={categories.map((value) => ({ value, label: value }))}/></Form.Item><Form.Item name="type" label="Value type" rules={[{ required: true }]}><Select style={{ minWidth: 160 }} options={types.map((value) => ({ value, label: value }))}/></Form.Item><Form.Item name="unit_label" label="Unit label"><Input style={{ width: 150 }}/></Form.Item><Form.Item name="sort_order" label="Sort order" rules={[{ required: true }]}><InputNumber min={0}/></Form.Item></Space><Form.Item name="default_value" label="Global default">{type === 'boolean' ? <Switch/> : type === 'integer' || type === 'decimal' ? <InputNumber precision={type === 'integer' ? 0 : undefined} style={{ width: '100%' }}/> : type === 'json' ? <Input.TextArea rows={5} className="central-code"/> : <Input/>}</Form.Item><Space><Form.Item name="is_active" valuePropName="checked"><Switch/> <span>Active</span></Form.Item><Form.Item name="is_visible" valuePropName="checked"><Switch/> <span>Visible</span></Form.Item><Form.Item name="is_billable" valuePropName="checked"><Switch/> <span>Billable</span></Form.Item></Space></Form></Modal>
    </CentralLayout>;
}
