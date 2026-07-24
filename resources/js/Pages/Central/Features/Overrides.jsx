import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import CentralLayout from '@/Layouts/CentralLayout';
import { HistoryOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

const display = (value) => value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export default function Overrides({ tenants, selectedTenant, rows, expiring }) {
    const [editing, setEditing] = useState(null);
    const [history, setHistory] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);
    const [form] = Form.useForm();
    const tenantOptions = tenants.map((tenant) => ({ value: tenant.id, label: `${tenant.company_name} · ${tenant.plan?.name || 'No plan'}` }));
    const grouped = useMemo(() => rows.reduce((result, row) => ({ ...result, [row.feature.category]: [...(result[row.feature.category] || []), row] }), {}), [rows]);

    const edit = (row) => {
        const override = row.override || {};
        setEditing(row);
        form.setFieldsValue({ mode: override.mode || 'inherit', value: typeof override.value === 'object' ? JSON.stringify(override.value, null, 2) : override.value ?? override.limit_value, reason: override.reason, starts_at: override.starts_at ? dayjs(override.starts_at) : null, expires_at: override.expires_at ? dayjs(override.expires_at) : null });
    };
    const save = (values) => router.put(route('central.tenant-feature-overrides.update', [selectedTenant.id, editing.feature.id]), { ...values, starts_at: values.starts_at?.toISOString(), expires_at: values.expires_at?.toISOString() }, { preserveScroll: true, onSuccess: () => setEditing(null) });
    const reset = (row) => Modal.confirm({ title: `Reset ${row.feature.name}?`, content: 'The effective value will immediately return to the plan or global default.', okText: 'Reset to plan', onOk: () => router.delete(route('central.tenant-feature-overrides.destroy', [selectedTenant.id, row.feature.id]), { preserveScroll: true }) });
    const openHistory = async (row) => {
        const response = await fetch(route('central.tenant-feature-overrides.history', [selectedTenant.id, row.feature.id]), { headers: { Accept: 'application/json' } });
        setHistoryRows(await response.json());
        setHistory(row);
    };

    const columns = [
        { title: 'Feature', render: (_, row) => <><Typography.Text strong>{row.feature.name}</Typography.Text><br/><Typography.Text type="secondary">{row.feature.key} · {row.feature.type}</Typography.Text></> },
        { title: 'Inherited plan value', render: (_, row) => <Typography.Text code>{display(row.inherited_value)}</Typography.Text> },
        { title: 'Effective value', render: (_, row) => <><Typography.Text code>{display(row.effective_value)}</Typography.Text><br/><Tag color={row.effective_source === 'tenant override' ? 'gold' : 'default'}>{row.effective_source}</Tag></> },
        { title: 'Current override', render: (_, row) => row.override && row.override.mode !== 'inherit' ? <><StatusBadge value={row.override.mode}/><br/><Typography.Text type="secondary">{row.override.reason || 'No reason'}{row.override.expires_at ? ` · expires ${dayjs(row.override.expires_at).format('YYYY-MM-DD')}` : ''}</Typography.Text></> : <Typography.Text type="secondary">Inherit</Typography.Text> },
        { title: '', width: 210, render: (_, row) => <Space><Button icon={<SettingOutlined/>} onClick={() => edit(row)}>Configure</Button><Button icon={<HistoryOutlined/>} onClick={() => openHistory(row)}>History</Button>{row.override && row.override.mode !== 'inherit' && <Button type="text" danger icon={<ReloadOutlined/>} onClick={() => reset(row)}>Reset</Button>}</Space> },
    ];

    return <CentralLayout title="Feature Overrides">
        <PageHeader eyebrow="Customers" title="Feature Overrides" description="Inspect plan inheritance and apply time-bounded tenant-specific feature values with a complete audit trail."/>
        <SectionCard title="Tenant" description="Choose a workspace to inspect its effective feature set"><Select showSearch optionFilterProp="label" value={selectedTenant?.id} options={tenantOptions} style={{ width: '100%', maxWidth: 560 }} placeholder="Choose a tenant" onChange={(tenant_id) => router.get(route('central.tenant-feature-overrides.index'), { tenant_id }, { preserveState: true })}/></SectionCard>
        {selectedTenant ? Object.entries(grouped).map(([category, categoryRows]) => <SectionCard key={category} title={category.replaceAll('_', ' ')} description={`${categoryRows.length} registered features`}><Table rowKey={(row) => row.feature.id} dataSource={categoryRows} columns={columns} pagination={false} scroll={{ x: 1050 }}/></SectionCard>) : <Alert type="info" showIcon message="Create a tenant before configuring feature overrides."/>}
        <SectionCard title="Expiring in the next 30 days" description="Overrides that will automatically return to inherited values"><Table rowKey="id" dataSource={expiring} pagination={false} columns={[{ title: 'Tenant', dataIndex: ['tenant', 'company_name'] }, { title: 'Feature', dataIndex: ['feature', 'name'] }, { title: 'Mode', render: (_, row) => <StatusBadge value={row.mode}/> }, { title: 'Expires', render: (_, row) => dayjs(row.expires_at).format('YYYY-MM-DD HH:mm') }]}/></SectionCard>
        <Modal open={Boolean(editing)} title={`Configure ${editing?.feature.name || ''}`} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Save override" destroyOnClose><Form form={form} layout="vertical" onFinish={save}><Form.Item name="mode" label="Mode" rules={[{ required: true }]}><Select options={[{value:'inherit',label:'Inherit plan value'},{value:'enable',label:'Enable'},{value:'disable',label:'Disable'},{value:'custom_limit',label:'Custom value or limit'}]}/></Form.Item><Form.Item noStyle shouldUpdate={(before, after) => before.mode !== after.mode}>{({ getFieldValue }) => getFieldValue('mode') === 'custom_limit' && <Form.Item name="value" label="Custom value" rules={[{ required: true }]}>{editing?.feature.type === 'integer' || editing?.feature.type === 'decimal' ? <InputNumber min={0} precision={editing?.feature.type === 'integer' ? 0 : undefined} style={{ width: '100%' }}/> : editing?.feature.type === 'json' ? <Input.TextArea rows={5} placeholder='{"key":"value"}'/> : <Input/>}</Form.Item>}</Form.Item><Form.Item name="reason" label="Reason" dependencies={['mode']} rules={[({ getFieldValue }) => ({ required: getFieldValue('mode') !== 'inherit', message: 'Explain why this tenant differs from its plan.' })]}><Input.TextArea rows={3}/></Form.Item><Space style={{ width: '100%' }} align="start"><Form.Item name="starts_at" label="Starts at"><DatePicker showTime/></Form.Item><Form.Item name="expires_at" label="Expires at"><DatePicker showTime/></Form.Item></Space></Form></Modal>
        <Drawer open={Boolean(history)} onClose={() => setHistory(null)} width={620} title={`${history?.feature.name || ''} audit history`}>{historyRows.length ? historyRows.map((item) => <div className="central-attention" key={item.id}><span className="central-attention__copy"><Typography.Text strong>{item.action}</Typography.Text><Typography.Text type="secondary">{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')} · administrator #{item.admin_id || 'system'}</Typography.Text><Typography.Text code>{display(item.old_values)} → {display(item.new_values)}</Typography.Text></span></div>) : <Alert type="info" showIcon message="No changes have been recorded for this feature."/>}</Drawer>
    </CentralLayout>;
}
