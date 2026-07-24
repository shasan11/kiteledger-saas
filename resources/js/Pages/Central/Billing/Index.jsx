import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney, humanize } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';
import { EditOutlined, FilePdfOutlined, PaperClipOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Alert, Button, Drawer, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

const copy = {
    subscriptions: ['Subscriptions', 'Manage plan periods, renewals, pauses, cancellations, and customer access.'],
    invoices: ['Invoices', 'Review issued invoices, balances, payment state, and immutable billing snapshots.'],
    payments: ['Payments', 'Trace manual and gateway transactions, proof, references, and refund state.'],
    gateways: ['Payment Gateways', 'Manage supported providers with encrypted credentials, webhook health, and explicit activation.'],
};
const definitions = {
    subscriptions: [['tenant', 'Tenant'], ['plan', 'Plan'], ['billing_cycle', 'Billing cycle'], ['status', 'Status'], ['trial_ends_at', 'Trial'], ['current_period_starts_at', 'Period starts'], ['current_period_ends_at', 'Renewal'], ['gateway', 'Gateway'], ['amount', 'Amount']],
    invoices: [['invoice_number', 'Invoice'], ['tenant', 'Tenant'], ['plan', 'Subscription'], ['issue_date', 'Issue date'], ['due_date', 'Due date'], ['subtotal', 'Subtotal'], ['discount', 'Discount'], ['tax', 'Tax'], ['total', 'Total'], ['paid_amount', 'Paid'], ['balance', 'Balance'], ['status', 'Status']],
    payments: [['reference', 'Reference'], ['tenant', 'Tenant'], ['invoice', 'Invoice'], ['gateway', 'Gateway'], ['payment_method', 'Method'], ['amount', 'Amount'], ['currency', 'Currency'], ['status', 'Status'], ['paid_at', 'Payment date'], ['refunded_amount', 'Refunded'], ['added_by', 'Added by']],
    gateways: [['name', 'Gateway'], ['slug', 'Driver'], ['mode', 'Mode'], ['is_active', 'Active'], ['supported_currencies', 'Currencies'], ['webhook_health', 'Webhook health'], ['last_tested_at', 'Last tested'], ['sort_order', 'Order']],
};

export default function BillingIndex({ kind, rows, filters = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [gateway, setGateway] = useState(null);
    const [refund, setRefund] = useState(null);
    const [form] = Form.useForm();
    const [refundForm] = Form.useForm();
    const apply = (extra = {}) => router.get(window.location.pathname, { ...filters, search: search || undefined, ...extra }, { preserveState: true, replace: true });
    const render = (key, value, row) => {
        if (key === 'tenant') return row.tenant?.company_name || row.tenant_id;
        if (key === 'plan') return row.plan?.name || row.subscription?.plan?.name || row.plan_id || '—';
        if (key === 'invoice') return row.invoice?.invoice_number || row.invoice_number || row.invoice_id || '—';
        if (key === 'added_by') return row.added_by?.name || row.added_by || '—';
        if (key === 'status' || key === 'webhook_health') return <StatusBadge value={value}/>;
        if (key === 'is_active') return <StatusBadge value={value ? 'active' : 'inactive'}/>;
        if (['subtotal', 'discount', 'tax', 'total', 'paid_amount', 'balance', 'amount', 'refunded_amount'].includes(key)) return formatMoney(value, row.currency || 'USD');
        if (key.endsWith('_at') || key.endsWith('_date')) return formatDate(value, key.endsWith('_at'));
        if (Array.isArray(value)) return value.map((item) => <Tag key={item}>{item}</Tag>);
        return String(value ?? '—');
    };
    const editGateway = (row) => { setGateway(row); form.setFieldsValue({ ...row, secret_key: '', webhook_secret: '', config: row.safe_config || {} }); };
    const saveGateway = (values) => router.put(route('central.gateways.update', gateway.id), values, { onSuccess: () => setGateway(null) });
    const subscriptionAction = (row, action) => Modal.confirm({ title: `${humanize(action)} subscription?`, content: `This changes access for ${row.tenant?.company_name || row.tenant_id} and is recorded in the lifecycle history.`, okText: humanize(action), okButtonProps: { danger: action === 'cancel' }, onOk: () => router.post(route('central.subscriptions.action', row.id), { action }) });
    const openRefund = (row) => { setRefund(row); refundForm.setFieldsValue({ amount: Math.max(0, Number(row.amount) - Number(row.refunded_amount || 0)), reason: '', idempotency_key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` }); };
    const submitRefund = (values) => router.post(route('central.payments.refund', refund.id), values, { preserveScroll: true, onSuccess: () => { setRefund(null); refundForm.resetFields(); } });
    const columns = definitions[kind].map(([key, title]) => ({ key, dataIndex: key, title, render: (value, row) => render(key, value, row) }));
    if (kind === 'subscriptions') columns.push({ title: 'Actions', key: 'actions', render: (_, row) => <Space><Button onClick={() => subscriptionAction(row, row.status === 'paused' || row.status === 'cancelled' ? 'reactivate' : 'pause')}>{row.status === 'paused' || row.status === 'cancelled' ? 'Reactivate' : 'Pause'}</Button><Button danger onClick={() => subscriptionAction(row, 'cancel')}>Cancel</Button></Space> });
    if (kind === 'invoices') columns.push({ title: 'Actions', key: 'actions', render: (_, row) => <Space><Button title="Download PDF" icon={<FilePdfOutlined/>} onClick={() => window.location.assign(route('central.invoices.pdf', row.id))}/>{row.status !== 'paid' && <Button type="primary" onClick={() => router.visit(route('central.payments.manual.create', { invoice_id: row.id, tenant_id: row.tenant_id }))}>Add payment</Button>}<Button onClick={() => router.post(route('central.invoices.send', row.id))}>Send</Button></Space> });
    if (kind === 'payments') columns.push({ title: 'Proof', key: 'proof', render: (_, row) => row.has_proof ? <Button icon={<PaperClipOutlined/>} href={route('central.payments.proof', row.id)}>Download</Button> : '—' }, { title: 'Actions', key: 'actions', render: (_, row) => row.status === 'success' && Number(row.refunded_amount || 0) < Number(row.amount) ? <Button danger onClick={() => openRefund(row)}>Refund</Button> : '—' });
    if (kind === 'gateways') columns.push({ title: 'Actions', key: 'actions', render: (_, row) => <Space><Button onClick={() => router.post(route('central.gateways.test', row.id))}>Test</Button><Button icon={<EditOutlined/>} onClick={() => editGateway(row)}>Configure</Button></Space> });

    return <CentralLayout title={copy[kind][0]}>
        <PageHeader eyebrow="Revenue" title={copy[kind][0]} description={copy[kind][1]} actions={(kind === 'payments' || kind === 'invoices') && <Button type="primary" icon={<PlusOutlined/>} onClick={() => router.visit(route('central.payments.manual.create'))}>Add Manual Payment</Button>}/>
        <SectionCard><div className="central-toolbar"><Input.Search className="central-toolbar__search" prefix={<SearchOutlined/>} allowClear value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => apply({ page: undefined })} placeholder={`Search ${copy[kind][0].toLowerCase()}`}/>{kind !== 'gateways' && <Select allowClear placeholder="All statuses" value={filters.status || undefined} onChange={(status) => apply({ status, page: undefined })} options={['active', 'trialing', 'paused', 'cancelled', 'draft', 'issued', 'unpaid', 'partially_paid', 'paid', 'pending', 'success', 'failed', 'refunded'].map((value) => ({ value, label: humanize(value) }))}/>}<span className="central-filter-summary">{rows.total} records</span></div><Table rowKey="id" dataSource={rows.data} columns={columns} scroll={{ x: 1100 }} pagination={{ current: rows.current_page, total: rows.total, pageSize: rows.per_page, onChange: (page) => apply({ page }), showSizeChanger: false }}/></SectionCard>
        <Modal open={Boolean(refund)} title={`Refund ${refund?.reference || ''}`} onCancel={() => setRefund(null)} onOk={() => refundForm.submit()} okText="Issue refund" okButtonProps={{ danger: true }}><Alert type="warning" showIcon message="Refunds are sent to the payment provider immediately and are fully audited." style={{ marginBottom: 16 }}/><Form form={refundForm} layout="vertical" onFinish={submitRefund}><Form.Item name="idempotency_key" hidden><Input/></Form.Item><Form.Item name="amount" label="Refund amount" rules={[{ required: true }]}><InputNumber min={0.01} max={Math.max(0, Number(refund?.amount || 0) - Number(refund?.refunded_amount || 0))} precision={2} style={{ width: '100%' }}/></Form.Item><Form.Item name="reason" label="Reason" rules={[{ required: true, min: 10 }]}><Input.TextArea rows={3}/></Form.Item><Form.Item name="current_password" label="Current administrator password" rules={[{ required: true }]}><Input.Password autoComplete="current-password"/></Form.Item></Form></Modal>
        <Drawer width={620} open={Boolean(gateway)} title={`Configure ${gateway?.name || 'gateway'}`} onClose={() => setGateway(null)} extra={<Button type="primary" onClick={() => form.submit()}>Save</Button>}><Form form={form} layout="vertical" onFinish={saveGateway}><Form.Item name="name" label="Display name" rules={[{ required: true }]}><Input/></Form.Item><div className="central-two-column"><Form.Item name="mode" label="Mode"><Select options={['sandbox', 'live'].map((value) => ({ value, label: humanize(value) }))}/></Form.Item><Form.Item name="sort_order" label="Sort order"><InputNumber min={0} style={{ width: '100%' }}/></Form.Item></div><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch/></Form.Item><Form.Item name="supported_currencies" label="Supported currencies"><Select mode="tags" tokenSeparators={[',']}/></Form.Item>{gateway?.slug !== 'manual' && <><Form.Item name="public_key" label="Public or client key"><Input/></Form.Item><Form.Item name="secret_key" label="Secret key" extra={gateway?.has_secret_key ? 'Stored securely. Leave blank to retain it.' : 'Required before activation.'}><Input.Password autoComplete="new-password"/></Form.Item><Form.Item name="webhook_secret" label="Webhook secret" extra={gateway?.has_webhook_secret ? 'Stored securely. Leave blank to retain it.' : 'Required for signature verification.'}><Input.Password autoComplete="new-password"/></Form.Item>{gateway?.slug === 'paypal' && <Form.Item name={['config', 'webhook_id']} label="PayPal webhook ID"><Input/></Form.Item>}</>}{gateway?.slug === 'manual' && <><Form.Item name={['config', 'methods']} label="Accepted methods"><Select mode="multiple" options={['bank_transfer', 'cash', 'cheque', 'card_terminal', 'other'].map((value) => ({ value, label: humanize(value) }))}/></Form.Item><Form.Item name={['config', 'instructions']} label="Payment instructions"><Input.TextArea rows={4}/></Form.Item><Space size="large"><Form.Item name={['config', 'proof_required']} label="Require proof" valuePropName="checked"><Switch/></Form.Item><Form.Item name={['config', 'admin_approval']} label="Require approval" valuePropName="checked"><Switch/></Form.Item></Space></>}<Typography.Paragraph type="secondary">Webhook URL</Typography.Paragraph><Typography.Text code copyable>{gateway?.webhook_url}</Typography.Text>{gateway?.recent_webhook_events?.length > 0 && <div style={{ marginTop: 20 }}><Typography.Title level={5}>Recent webhook events</Typography.Title>{gateway.recent_webhook_events.map((event) => <div className="central-health-row" key={event.id}><span>{event.event_type}</span><StatusBadge value={event.status}/></div>)}</div>}</Form></Drawer>
    </CentralLayout>;
}
