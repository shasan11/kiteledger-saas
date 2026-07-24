import CentralLayout from '@/Layouts/CentralLayout';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Drawer, Form, Input, Modal, Select, Switch, Table, Tag } from 'antd';
import { useState } from 'react';

export default function AdminUsers({ admins, roles }) {
    const [record, setRecord] = useState(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const edit = (admin = null) => { setRecord(admin); form.resetFields(); form.setFieldsValue(admin ? { ...admin, role_id: admin.roles?.[0]?.id, password: '' } : { is_active: true }); setOpen(true); };
    const save = (values) => { const options = { preserveScroll: true, onSuccess: () => setOpen(false) }; record ? router.patch(route('central.central-admins.update', record.id), values, options) : router.post(route('central.central-admins.store'), values, options); };
    const remove = (admin) => Modal.confirm({ title: `Remove ${admin.name}?`, content: 'The administrator will immediately lose control-center access. The action is audited.', okText: 'Remove administrator', okButtonProps: { danger: true }, onOk: () => router.delete(route('central.central-admins.destroy', admin.id)) });
    const columns = [
        { title: 'Administrator', key: 'admin', render: (_, row) => <><strong>{row.name}</strong><br/><span className="central-muted">{row.email}</span></> },
        { title: 'Role', render: (_, row) => row.roles?.length ? row.roles.map((role) => <Tag key={role.id}>{role.label}</Tag>) : <Tag color="warning">Legacy {row.role}</Tag> },
        { title: 'Status', dataIndex: 'is_active', render: (value) => <StatusBadge value={value ? 'active' : 'disabled'}/> },
        { title: 'Last sign in', dataIndex: 'last_login_at', render: (value) => formatDate(value, true) },
        { title: 'Created', dataIndex: 'created_at', render: (value) => formatDate(value, true) },
        { title: '', width: 110, render: (_, row) => <span style={{ display: 'flex', gap: 6 }}><Button icon={<EditOutlined/>} aria-label={`Edit ${row.name}`} onClick={() => edit(row)}/><Button danger icon={<DeleteOutlined/>} aria-label={`Remove ${row.name}`} onClick={() => remove(row)}/></span> },
    ];

    return <CentralLayout title="Admin Users">
        <PageHeader eyebrow="Administration" title="Admin Users" description="Manage control-center access, operating roles, and account status." actions={<Button type="primary" icon={<PlusOutlined/>} onClick={() => edit()}>Add administrator</Button>}/>
        <SectionCard><Table rowKey="id" dataSource={admins.data} columns={columns} pagination={{ current: admins.current_page, total: admins.total, pageSize: admins.per_page, showSizeChanger: false, onChange: (page) => router.get(route('central.central-admins.index'), { page }, { preserveState: true }) }}/></SectionCard>
        <Drawer open={open} onClose={() => setOpen(false)} width={520} title={record ? 'Edit administrator' : 'Add administrator'} extra={<Button type="primary" onClick={() => form.submit()}>Save</Button>}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input/></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email"/></Form.Item><Form.Item name="role_id" label="Role" rules={[{ required: true }]}><Select options={roles.map((role) => ({ value: role.id, label: role.label }))}/></Form.Item><Form.Item name="password" label={record ? 'New password' : 'Password'} extra={record ? 'Leave blank to retain the current password.' : 'Use at least 12 characters.'} rules={record ? [] : [{ required: true }, { min: 12 }]}><Input.Password autoComplete="new-password"/></Form.Item><Form.Item name="is_active" label="Active" valuePropName="checked"><Switch/></Form.Item></Form></Drawer>
    </CentralLayout>;
}
