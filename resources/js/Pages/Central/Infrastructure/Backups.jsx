import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { CloudDownloadOutlined, DeleteOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Form, Modal, Select, Space, Table } from 'antd';
import { useState } from 'react';

export default function Backups({ backups, tenants, filters = {} }) {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const apply = (extra) => router.get(route('central.backups.index'), { ...filters, ...extra, page: undefined }, { preserveState: true, replace: true });
    const create = (values) => router.post(route('central.backups.store'), values, { onSuccess: () => setOpen(false) });
    const remove = (backup) => Modal.confirm({ title: 'Permanently delete this backup?', content: 'The private SQL file and its manifest will be removed. This cannot be reversed.', okText: 'Delete backup', okButtonProps: { danger: true }, onOk: () => router.delete(route('central.backups.destroy', backup.id)) });
    const columns = [
        { title: 'Tenant', render: (_, row) => row.tenant?.company_name || row.tenant_id || 'Central database' },
        { title: 'Type', dataIndex: 'type' }, { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value}/> },
        { title: 'Size', dataIndex: 'size_bytes', render: (value) => value ? `${(value / 1024 / 1024).toFixed(2)} MB` : '—' },
        { title: 'Verified', dataIndex: 'verified_at', render: (value) => formatDate(value, true) }, { title: 'Expires', dataIndex: 'expires_at', render: (value) => formatDate(value, true) },
        { title: '', width: 190, render: (_, row) => <Space><Button icon={<SafetyCertificateOutlined/>} onClick={() => router.post(route('central.backups.verify', row.id))}>Verify</Button>{['completed', 'verified'].includes(row.status) && <Button icon={<CloudDownloadOutlined/>} href={route('central.backups.download', row.id)} aria-label="Download backup"/>}<Button danger icon={<DeleteOutlined/>} onClick={() => remove(row)} aria-label="Delete backup"/></Space> },
    ];
    return <CentralLayout title="Backups"><PageHeader eyebrow="Infrastructure" title="Backups" description="Create private tenant database backups, verify checksums, control retention, and download recoverable artifacts." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => setOpen(true)}>Create backup</Button>}/><SectionCard><div className="central-toolbar"><Select allowClear showSearch optionFilterProp="label" placeholder="All tenants" value={filters.tenant_id || undefined} onChange={(tenant_id) => apply({ tenant_id })} options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.company_name }))}/><Select allowClear placeholder="All statuses" value={filters.status || undefined} onChange={(status) => apply({ status })} options={['running', 'completed', 'verified', 'failed'].map((value) => ({ value, label: value }))}/><span className="central-filter-summary">{backups.total} backups</span></div><Table rowKey="id" dataSource={backups.data} columns={columns} scroll={{ x: 900 }} pagination={{ current: backups.current_page, total: backups.total, pageSize: backups.per_page, showSizeChanger: false, onChange: (page) => router.get(route('central.backups.index'), { ...filters, page }, { preserveState: true }) }}/></SectionCard><Modal open={open} title="Create tenant backup" okText="Create and verify" onCancel={() => setOpen(false)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={create}><Form.Item name="tenant_id" label="Tenant" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.company_name }))}/></Form.Item></Form></Modal></CentralLayout>;
}
