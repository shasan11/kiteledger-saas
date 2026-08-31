import { CheckCircleTwoTone, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Avatar, Button, Drawer, Empty, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import PermissionSwitches from '@/Components/Platform/PermissionSwitches';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, humanize, initials } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

const yesNo = (value) => (value ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleOutlined style={{ color: '#bfbfbf' }} />);

export default function PlatformTenantMembers({ tenant, members, invitations, roleOptions, permissionKeys }) {
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [inviteForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const roleDefaults = useMemo(() => Object.fromEntries(roleOptions.map((role) => [role.value, role.permissions])), [roleOptions]);
    const syncDefaults = (form) => (role) => form.setFieldsValue({ permissions: { ...(roleDefaults[role] || {}) } });

    const openInvite = () => {
        inviteForm.resetFields();
        inviteForm.setFieldsValue({ role: 'member', permissions: { ...(roleDefaults.member || {}) } });
        setInviteOpen(true);
    };

    const openEdit = (member) => {
        setEditing(member);
        editForm.resetFields();
        editForm.setFieldsValue({ role: member.role, is_active: member.is_active, permissions: Object.fromEntries(permissionKeys.map((key) => [key, Boolean(member[key])])) });
    };

    const columns = [
        {
            title: 'Member', key: 'user',
            render: (_, row) => (
                <Space>
                    <Avatar src={row.user?.avatar || undefined}>{initials(row.user?.name)}</Avatar>
                    <span><strong>{row.user?.name}</strong><br /><span className="central-muted">{row.user?.email}</span></span>
                </Space>
            ),
        },
        { title: 'Role', dataIndex: 'role', render: (value) => <Tag color={value === 'owner' ? 'gold' : 'blue'}>{humanize(value)}</Tag> },
        { title: 'Billing', dataIndex: 'can_manage_billing', align: 'center', render: yesNo },
        { title: 'Plan', dataIndex: 'can_manage_plan', align: 'center', render: yesNo },
        { title: 'Users', dataIndex: 'can_manage_users', align: 'center', render: yesNo },
        { title: 'Joined', dataIndex: 'accepted_at', responsive: ['md'], render: (value) => formatDate(value) },
        { title: 'Status', key: 'status', render: (_, row) => <StatusBadge value={row.revoked_at ? 'cancelled' : row.is_active ? 'active' : 'suspended'} /> },
        {
            title: '', key: 'actions', width: 180,
            render: (_, row) => (
                <Space size={4} wrap>
                    <Button size="small" onClick={() => openEdit(row)}>Permissions</Button>
                    {row.is_active && (
                        <Popconfirm
                            title={`Remove ${row.user?.name || 'this member'}?`}
                            description="They lose access immediately. Accounting data is not deleted."
                            okText="Revoke" okButtonProps={{ danger: true }}
                            onConfirm={() => router.delete(route('central.account.tenants.members.revoke', { tenant: tenant.id, membership: row.id }), { preserveScroll: true })}
                        >
                            <Button size="small" danger>Revoke</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <PlatformLayout title={`${tenant.company_name} · Members`}>
            <PageHeader
                eyebrow={tenant.company_name}
                title="Members"
                description="People with a KiteLedger account who can access this company."
                actions={<Button type="primary" icon={<PlusOutlined />} onClick={openInvite}>Invite member</Button>}
            />

            <SectionCard>
                <Table rowKey="id" size="middle" scroll={{ x: 820 }} dataSource={members} columns={columns} pagination={members.length > 20 ? { pageSize: 20 } : false} locale={{ emptyText: <Empty description="No members yet." /> }} />
            </SectionCard>

            {invitations.length > 0 && (
                <SectionCard title="Pending invitations" style={{ marginTop: 16 }}>
                    <Table rowKey="id" size="small" pagination={false} dataSource={invitations} columns={[
                        { title: 'Email', dataIndex: 'email' },
                        { title: 'Role', dataIndex: 'role', render: (value) => humanize(value) },
                        { title: 'Expires', dataIndex: 'expires_at', render: (value) => formatDate(value, true) },
                    ]} />
                </SectionCard>
            )}

            <Drawer
                open={inviteOpen} onClose={() => setInviteOpen(false)} width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth : 560)}
                title="Invite a member" destroyOnHidden extra={<Button type="primary" onClick={() => inviteForm.submit()}>Send invitation</Button>}
            >
                <Form form={inviteForm} layout="vertical" onFinish={(values) => router.post(route('central.account.tenants.members.invite', tenant.id), values, { preserveScroll: true, onSuccess: () => setInviteOpen(false) })}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email" /></Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} onChange={syncDefaults(inviteForm)} />
                    </Form.Item>
                    <Typography.Text type="secondary">They will receive a secure link to set their own password. No default password is ever created.</Typography.Text>
                    <div style={{ marginTop: 12 }}><PermissionSwitches keys={permissionKeys} /></div>
                </Form>
            </Drawer>

            <Modal
                open={Boolean(editing)} title={`Permissions · ${editing?.user?.name || ''}`} destroyOnHidden
                onCancel={() => setEditing(null)} onOk={() => editForm.submit()} okText="Save"
            >
                <Form form={editForm} layout="vertical" onFinish={(values) => router.patch(route('central.account.tenants.members.update', { tenant: tenant.id, membership: editing.id }), values, { preserveScroll: true, onSuccess: () => setEditing(null) })}>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} onChange={syncDefaults(editForm)} />
                    </Form.Item>
                    <Form.Item name="is_active" label="Membership active" valuePropName="checked"><Switch /></Form.Item>
                    <PermissionSwitches keys={permissionKeys} />
                </Form>
            </Modal>
        </PlatformLayout>
    );
}
