import { CheckCircleTwoTone, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Avatar, Button, Drawer, Empty, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import PermissionSwitches from '@/Components/Platform/PermissionSwitches';
import { PortalDetailHeader } from '@/Components/Platform/PortalDetailHeader';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, humanize, initials } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

const yesNo = (value) => (value ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleOutlined style={{ color: '#bfbfbf' }} />);

export default function PlatformTenantMembers({ tenant, abilities, members, invitations, roleOptions, permissionKeys }) {
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
            <PortalDetailHeader
                avatar={initials(tenant.company_name)}
                eyebrow={tenant.company_name}
                title="Members"
                description="People with a KiteLedger account who can access this company."
                badges={<Tag color={abilities.is_owner ? 'gold' : 'blue'}>{abilities.role_label}</Tag>}
                backHref={route('central.account.tenants.index')}
                tabs={[
                    { label: 'Overview', href: route('central.account.tenants.show', tenant.id) },
                    { label: 'Company details', href: route('central.account.tenants.settings', tenant.id) },
                    { label: 'Members', href: route('central.account.tenants.members', tenant.id), active: true },
                    { label: 'Billing', href: route('central.account.tenants.billing', tenant.id), visible: abilities.can_manage_billing },
                ]}
                actions={<Button type="primary" icon={<PlusOutlined />} onClick={openInvite}>Invite member</Button>}
            />

            <PortalSection title="Organization members" description={`${members.length} member${members.length === 1 ? '' : 's'}`}>
                <PortalList emptyText="No members yet.">{members.map((member) => <PortalListCard
                    key={member.id}
                    avatar={member.user?.avatar || initials(member.user?.name)}
                    title={member.user?.name}
                    subtitle={member.user?.email}
                    badges={<><Tag color={member.role === 'owner' ? 'gold' : 'blue'}>{humanize(member.role)}</Tag><StatusBadge value={member.revoked_at ? 'cancelled' : member.is_active ? 'active' : 'suspended'} /></>}
                    meta={[
                        { label: 'Billing', value: member.can_manage_billing ? 'Allowed' : 'No access' },
                        { label: 'Users', value: member.can_manage_users ? 'Allowed' : 'No access' },
                        { label: 'Joined', value: formatDate(member.accepted_at) },
                    ]}
                    actions={<Space wrap><Button onClick={() => openEdit(member)}>Permissions</Button>{member.is_active && <Popconfirm title={`Remove ${member.user?.name || 'this member'}?`} description="They lose access immediately. Accounting data is not deleted." okText="Revoke" okButtonProps={{ danger: true }} onConfirm={() => router.delete(route('central.account.tenants.members.revoke', { tenant: tenant.id, membership: member.id }), { preserveScroll: true })}><Button danger>Revoke</Button></Popconfirm>}</Space>}
                />)}</PortalList>
            </PortalSection>

            {invitations.length > 0 && (
                <PortalSection title="Pending invitations" description="Invitations waiting to be accepted.">
                    <PortalList>{invitations.map((invitation) => <PortalListCard key={invitation.id} icon={<PlusOutlined />} title={invitation.email} subtitle={`Invited as ${humanize(invitation.role)}`} badges={<StatusBadge value="invited" />} meta={[{ label: 'Sent', value: formatDate(invitation.created_at, true) }, { label: 'Expires', value: formatDate(invitation.expires_at, true) }]} />)}</PortalList>
                </PortalSection>
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
