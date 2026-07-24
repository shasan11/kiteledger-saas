import ActionDropdown from '@/Components/ActionDropdown';
import PageHeader from '@/Components/Central/PageHeader';
import RichTextEditor from '@/Components/Central/RichTextEditor';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Select, Switch, Table, Typography } from 'antd';
import { useState } from 'react';

export default function Configuration({ type, rows = [], categories = [], admins = [] }) {
    const categoriesMode = type === 'categories';
    const title = categoriesMode ? 'Support Categories' : 'Saved Replies';
    const [record, setRecord] = useState(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const edit = (row = null) => {
        setRecord(row);
        form.resetFields();
        form.setFieldsValue(row || (categoriesMode
            ? { default_priority: 'normal', is_active: true, sort_order: 0 }
            : { is_active: true }));
        setOpen(true);
    };
    const save = (values) => {
        const routeName = categoriesMode ? 'support-categories' : 'saved-replies';
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); form.resetFields(); } };
        record ? router.patch(route(`central.${routeName}.update`, record.id), values, options) : router.post(route(`central.${routeName}.store`), values, options);
    };
    const remove = (row) => Modal.confirm({
        title: `Delete ${categoriesMode ? 'category' : 'saved reply'}?`,
        content: categoriesMode ? 'Categories assigned to tickets cannot be deleted.' : 'This reply will no longer be available to support agents.',
        okText: 'Delete', okButtonProps: { danger: true },
        onOk: () => router.delete(route(`central.${categoriesMode ? 'support-categories' : 'saved-replies'}.destroy`, row.id), { preserveScroll: true }),
    });
    const actions = (row) => [
        { label: 'Edit', icon: <EditOutlined/>, onClick: () => edit(row) },
        { label: 'Delete', icon: <DeleteOutlined/>, danger: true, onClick: () => remove(row) },
    ];
    const columns = categoriesMode ? [
        { title: 'Category', dataIndex: 'name', render: (value, row) => <><Typography.Text strong>{value}</Typography.Text><br/><Typography.Text type="secondary">/{row.slug}</Typography.Text></> },
        { title: 'Default priority', dataIndex: 'default_priority', render: (value) => <StatusBadge value={value}/> },
        { title: 'Default assignee', dataIndex: ['default_assignee', 'name'], render: (value) => value || 'Unassigned' },
        { title: 'Order', dataIndex: 'sort_order', width: 90 },
        { title: 'Status', dataIndex: 'is_active', render: (value) => <StatusBadge value={value ? 'active' : 'disabled'}/> },
    ] : [
        { title: 'Title', dataIndex: 'title', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
        { title: 'Category', dataIndex: ['category', 'name'], render: (value) => value || 'All categories' },
        { title: 'Status', dataIndex: 'is_active', render: (value) => <StatusBadge value={value ? 'active' : 'disabled'}/> },
        { title: 'Last updated', dataIndex: 'updated_at' },
    ];
    columns.push({ title: '', key: 'actions', width: 52, render: (_, row) => <ActionDropdown items={actions(row)}/> });

    return <CentralLayout title={title}>
        <PageHeader eyebrow="Support" title={title} description={categoriesMode ? 'Route tickets by topic, priority, and default support owner.' : 'Maintain reusable, formatted answers for consistent support responses.'} actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => edit()}>Add {categoriesMode ? 'category' : 'saved reply'}</Button>}/>
        <SectionCard><Table className="central-table" rowKey="id" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 760 }}/></SectionCard>
        <Drawer open={open} width={560} title={record ? `Edit ${categoriesMode ? 'category' : 'saved reply'}` : `Add ${categoriesMode ? 'category' : 'saved reply'}`} onClose={() => setOpen(false)} destroyOnClose extra={<Button type="primary" onClick={() => form.submit()}>Save</Button>}>
            <Form form={form} layout="vertical" onFinish={save}>
                {categoriesMode ? <>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input/></Form.Item>
                    <Form.Item name="slug" label="Slug" extra="Leave blank to generate it from the name."><Input/></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={4}/></Form.Item>
                    <Form.Item name="default_priority" label="Default priority" rules={[{ required: true }]}><Select options={['low', 'normal', 'high', 'urgent'].map((value) => ({ value, label: humanize(value) }))}/></Form.Item>
                    <Form.Item name="default_assignee_id" label="Default assignee"><Select allowClear showSearch optionFilterProp="label" options={admins.map((admin) => ({ value: admin.id, label: admin.name }))}/></Form.Item>
                    <Form.Item name="sort_order" label="Display order" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }}/></Form.Item>
                </> : <>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input/></Form.Item>
                    <Form.Item name="category_id" label="Category"><Select allowClear options={categories.map((category) => ({ value: category.id, label: category.name }))}/></Form.Item>
                    <Form.Item name="body" label="Reply" rules={[{ required: true }]}><RichTextEditor autosaveKey={`support.saved-reply.${record?.id || 'new'}`}/></Form.Item>
                </>}
                <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch/></Form.Item>
            </Form>
        </Drawer>
    </CentralLayout>;
}
