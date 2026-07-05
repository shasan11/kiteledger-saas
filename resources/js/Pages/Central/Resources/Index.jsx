import CentralLayout from '@/Layouts/CentralLayout';
import { router } from '@inertiajs/react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';

export default function Index({ resource, rows, columns = [], editable = false, fields = [] }) {
    const [open, setOpen] = useState(false);
    const [record, setRecord] = useState(null);
    const [form] = Form.useForm();
    const edit = (row = null) => { setRecord(row); form.setFieldsValue(row || {}); setOpen(true); };
    const save = (values) => {
        if (values.supported_currencies && typeof values.supported_currencies === 'string') values.supported_currencies = values.supported_currencies.split(',').map((v) => v.trim()).filter(Boolean);
        const options = { preserveScroll: true, onSuccess: () => { setOpen(false); form.resetFields(); } };
        record ? router.patch(route(`central.${resource}.update`, record.id), values, options) : router.post(route(`central.${resource}.store`), values, options);
    };
    const remove = (row) => Modal.confirm({ title: 'Remove this resource?', content: 'This action is audited.', okButtonProps: { danger: true }, onOk: () => router.delete(route(`central.${resource}.destroy`, row.id), { preserveScroll: true }) });
    const lifecycle = (row, action) => router.post(route('central.subscriptions.action', row.id), { action }, { preserveScroll: true });
    const manualPayment = (row) => { const reference = window.prompt('Manual payment reference'); if (reference) router.post(route('central.invoices.manual-payment', row.id), { reference, amount: row.total }, { preserveScroll: true }); };

    const tableColumns = columns.map((key) => ({ title: key.replaceAll('_', ' '), dataIndex: key, render: (value) => key === 'status' ? <Tag>{value}</Tag> : typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—') }));
    if (editable || ['subscriptions', 'invoices', 'payments'].includes(resource)) tableColumns.push({ title: 'actions', key: 'actions', render: (_, row) => <Space wrap>{editable && <Button onClick={() => edit(row)}>Edit</Button>}{editable && !['gateways', 'platform-settings'].includes(resource) && <Button danger onClick={() => remove(row)}>Delete</Button>}{resource === 'subscriptions' && <><Button onClick={() => lifecycle(row, row.status === 'paused' || row.status === 'cancelled' ? 'reactivate' : 'pause')}>{row.status === 'paused' || row.status === 'cancelled' ? 'Reactivate' : 'Pause'}</Button><Button danger onClick={() => lifecycle(row, 'cancel')}>Cancel at period end</Button></>}{resource === 'invoices' && <Button href={route('central.invoices.pdf', row.id)}>PDF</Button>}{resource === 'invoices' && row.status !== 'paid' && <Button type="primary" onClick={() => manualPayment(row)}>Approve manual payment</Button>}{resource === 'payments' && row.status === 'success' && <Button danger onClick={() => { const amount = window.prompt('Refund amount'); if (amount) router.post(route('central.payments.refund', row.id), { amount }); }}>Refund</Button>}</Space> });

    const input = (field) => {
        if (field.startsWith('is_')) return <Switch/>;
        if (field === 'mode') return <Select options={['sandbox', 'live'].map((value) => ({ value }))}/>;
        if (field === 'status') return <Select options={['draft', 'active', 'published'].map((value) => ({ value }))}/>;
        if (field === 'type') return <Select options={['string', 'boolean', 'integer', 'json'].map((value) => ({ value }))}/>;
        if (field.includes('sort_order') || field.endsWith('_id')) return <InputNumber style={{ width: '100%' }}/>;
        return <Input.TextArea autoSize={{ minRows: 1, maxRows: 5 }} type={field.includes('secret') || field.includes('key') ? 'password' : 'text'}/>;
    };

    return <CentralLayout title={resource.replaceAll('-', ' ')}><Card extra={editable && <Button type="primary" onClick={() => edit()}>Add</Button>}><Table rowKey="id" dataSource={rows.data || []} pagination={{ current: rows.current_page, total: rows.total, pageSize: rows.per_page, onChange: (page) => router.get(window.location.pathname, { page }, { preserveState: true }) }} columns={tableColumns}/></Card><Modal open={open} title={record ? 'Edit resource' : 'Add resource'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={save}>{fields.map((field) => <Form.Item key={field} name={field} label={field.replaceAll('_', ' ')} valuePropName={field.startsWith('is_') ? 'checked' : 'value'}>{input(field)}</Form.Item>)}</Form></Modal></CentralLayout>;
}
