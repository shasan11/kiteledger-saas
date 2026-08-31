import { CheckCircleTwoTone, CloseCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Alert, Avatar, Button, Col, Descriptions, Drawer, Empty, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Switch, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { useMemo, useState } from 'react';
import PermissionSwitches, { PERMISSION_LABELS } from '@/Components/Platform/PermissionSwitches';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, humanize, initials } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';

const yesNo = (value) => (value ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CloseCircleOutlined style={{ color: '#bfbfbf' }} />);
const roleColor = { owner: 'gold', administrator: 'blue', billing_manager: 'purple', member: 'default', viewer: 'default' };

export default function PlatformUserShow({ platformUser, invoiceCounts, invitations, activity, assignableTenants, roleOptions, statusOptions, permissionKeys, can }) {
    const [assignOpen, setAssignOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [accountOpen, setAccountOpen] = useState(false);
    const [assignForm] = Form.useForm();
    const [membershipForm] = Form.useForm();
    const [accountForm] = Form.useForm();
    const [profileForm] = Form.useForm();

    const roleDefaults = useMemo(() => Object.fromEntries(roleOptions.map((role) => [role.value, role.permissions])), [roleOptions]);
    const memberships = platformUser.tenant_memberships || [];
    const activeMemberships = memberships.filter((membership) => membership.is_active && !membership.revoked_at);
    const billingMemberships = memberships.filter((membership) => membership.can_manage_billing || membership.can_view_invoices || membership.can_make_payments);
    const primary = memberships.find((membership) => membership.is_primary);
    const base = (name, params = {}) => route(name, { platformUser: platformUser.id, ...params });

    const openAssign = () => {
        assignForm.resetFields();
        assignForm.setFieldsValue({ role: 'member', permissions: { ...(roleDefaults.member || {}) } });
        setAssignOpen(true);
    };
    const openEdit = (membership) => {
        setEditing(membership);
        membershipForm.resetFields();
        membershipForm.setFieldsValue({
            role: membership.role,
            is_active: membership.is_active,
            permissions: Object.fromEntries(permissionKeys.map((key) => [key, Boolean(membership[key])])),
        });
    };
    const openAccount = () => {
        accountForm.resetFields();
        accountForm.setFieldsValue({ ...platformUser });
        setAccountOpen(true);
    };

    const syncRoleDefaults = (form) => (role) => form.setFieldsValue({ permissions: { ...(roleDefaults[role] || {}) } });
    const security = (action) => router.post(base('central.platform-users.security'), { action }, { preserveScroll: true });

    const membershipColumns = [
        { title: 'Company', key: 'tenant', render: (_, row) => <><strong>{row.tenant?.company_name || row.tenant_id}</strong>{row.is_primary && <Tag color="green" style={{ marginLeft: 8 }}>Primary</Tag>}</> },
        { title: 'Role', dataIndex: 'role', render: (value) => <Tag color={roleColor[value] || 'default'}>{humanize(value)}</Tag> },
        { title: 'Access', dataIndex: 'can_access_tenant', align: 'center', render: yesNo },
        { title: 'Users', dataIndex: 'can_manage_users', align: 'center', render: yesNo },
        { title: 'Billing', dataIndex: 'can_manage_billing', align: 'center', render: yesNo },
        { title: 'Plan', dataIndex: 'can_manage_plan', align: 'center', render: yesNo },
        { title: 'Joined', dataIndex: 'accepted_at', responsive: ['lg'], render: (value) => formatDate(value) },
        { title: 'Status', key: 'status', render: (_, row) => <StatusBadge value={row.revoked_at ? 'cancelled' : row.is_active ? 'active' : 'suspended'} /> },
        {
            title: '', key: 'actions', width: 220,
            render: (_, row) => can.manageMemberships ? (
                <Space size={4} wrap>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Permissions</Button>
                    {!row.is_primary && row.is_active && (
                        <Button size="small" onClick={() => router.post(base('central.platform-users.memberships.primary', { membership: row.id }), {}, { preserveScroll: true })}>Set primary</Button>
                    )}
                    {row.is_active && (
                        <Popconfirm
                            title={`Remove access to ${row.tenant?.company_name || 'this company'}?`}
                            description="The user loses access immediately. Accounting data is not deleted."
                            okText="Revoke access" okButtonProps={{ danger: true }}
                            onConfirm={() => router.delete(base('central.platform-users.memberships.destroy', { membership: row.id }), { preserveScroll: true })}
                        >
                            <Button size="small" danger>Revoke</Button>
                        </Popconfirm>
                    )}
                </Space>
            ) : null,
        },
    ];

    const billingColumns = [
        { title: 'Company', key: 'tenant', render: (_, row) => <a onClick={() => router.visit(route('central.tenants.show', row.tenant_id))}>{row.tenant?.company_name || row.tenant_id}</a> },
        { title: 'Current plan', key: 'plan', render: (_, row) => row.tenant?.subscription?.plan?.name || row.tenant?.plan?.name || '-' },
        { title: 'Subscription', key: 'subscription', render: (_, row) => row.tenant?.subscription?.status ? <StatusBadge value={row.tenant.subscription.status} /> : <span className="central-muted">None</span> },
        { title: 'Billing permission', dataIndex: 'can_manage_billing', render: (value) => value ? <Tag color="blue">Manage</Tag> : <Tag>Read only</Tag> },
        { title: 'Plan permission', dataIndex: 'can_manage_plan', render: (value) => value ? <Tag color="purple">Manage plan</Tag> : <Tag>No</Tag> },
        { title: 'Invoices', key: 'invoices', render: (_, row) => `${invoiceCounts?.[row.tenant_id] ?? 0} invoices` },
        { title: 'Payments', dataIndex: 'can_make_payments', align: 'center', render: yesNo },
    ];

    return (
        <CentralLayout title={platformUser.name}>
            <PageHeader
                eyebrow="Platform user"
                title={platformUser.name}
                description={platformUser.email}
                actions={can.update ? <Button type="primary" icon={<EditOutlined />} onClick={openAccount}>Edit user</Button> : null}
            >
                <Space size="large" wrap style={{ marginTop: 12 }}>
                    <Avatar size={48} src={platformUser.avatar || undefined}>{initials(platformUser.name)}</Avatar>
                    <StatusBadge value={platformUser.status} />
                    <Typography.Text type="secondary">Last active {formatDate(platformUser.last_active_at, true)}</Typography.Text>
                </Space>
            </PageHeader>

            <Tabs
                defaultActiveKey="overview"
                items={[
                    {
                        key: 'overview', label: 'Overview',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={14}>
                                    <SectionCard title="Account">
                                        <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered items={[
                                            { key: 'name', label: 'Full name', children: platformUser.name },
                                            { key: 'email', label: 'Email', children: platformUser.email },
                                            { key: 'phone', label: 'Phone', children: platformUser.phone || '-' },
                                            { key: 'status', label: 'Status', children: <StatusBadge value={platformUser.status} /> },
                                            { key: 'created', label: 'Created', children: formatDate(platformUser.created_at, true) },
                                            { key: 'login', label: 'Last login', children: formatDate(platformUser.last_login_at, true) },
                                            { key: 'active', label: 'Last active', children: formatDate(platformUser.last_active_at, true) },
                                            { key: 'primary', label: 'Primary company', children: primary?.tenant?.company_name || '-' },
                                        ]} />
                                    </SectionCard>
                                </Col>
                                <Col xs={24} lg={10}>
                                    <Row gutter={[16, 16]}>
                                        {[['Companies', activeMemberships.length], ['Billing-capable', billingMemberships.length], ['Owner of', activeMemberships.filter((m) => m.role === 'owner').length], ['Administrator of', activeMemberships.filter((m) => m.role === 'administrator').length]].map(([label, value]) => (
                                            <Col xs={12} key={label}><SectionCard><Statistic title={label} value={value} /></SectionCard></Col>
                                        ))}
                                    </Row>
                                    <SectionCard title="Memberships" style={{ marginTop: 16 }}>
                                        {activeMemberships.length
                                            ? <Space wrap>{activeMemberships.map((membership) => <Tag key={membership.id} color={roleColor[membership.role] || 'default'}>{membership.tenant?.company_name} · {humanize(membership.role)}</Tag>)}</Space>
                                            : <Empty description="No company access yet." />}
                                    </SectionCard>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: 'tenants', label: 'Tenant Access',
                        children: (
                            <SectionCard
                                title="Company access"
                                description="Each membership carries its own role and permission flags."
                                extra={can.manageMemberships ? <Button type="primary" icon={<PlusOutlined />} onClick={openAssign}>Assign tenant</Button> : null}
                            >
                                <Table rowKey="id" size="middle" scroll={{ x: 900 }} dataSource={memberships} columns={membershipColumns} pagination={memberships.length > 20 ? { pageSize: 20 } : false} locale={{ emptyText: <Empty description="This user has no company access." /> }} />
                                {invitations.length > 0 && (
                                    <>
                                        <Typography.Title level={5} style={{ marginTop: 24 }}>Invitations</Typography.Title>
                                        <Table rowKey="id" size="small" pagination={false} dataSource={invitations} columns={[
                                            { title: 'Company', dataIndex: 'tenant' },
                                            { title: 'Role', dataIndex: 'role', render: (value) => humanize(value) },
                                            { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value} /> },
                                            { title: 'Expires', dataIndex: 'expires_at', render: (value) => formatDate(value, true) },
                                            {
                                                title: '', key: 'actions', width: 100,
                                                render: (_, row) => can.manageMemberships && row.status === 'invited'
                                                    ? <Popconfirm title="Revoke this invitation?" onConfirm={() => router.delete(route('central.platform-user-invitations.destroy', row.id), { preserveScroll: true })}><Button size="small" danger>Revoke</Button></Popconfirm>
                                                    : null,
                                            },
                                        ]} />
                                    </>
                                )}
                            </SectionCard>
                        ),
                    },
                    {
                        key: 'billing', label: 'Billing Access',
                        children: (
                            <SectionCard title="Billing access" description="Only companies where this user holds a billing permission.">
                                <Table rowKey="id" size="middle" scroll={{ x: 900 }} dataSource={billingMemberships} columns={billingColumns} pagination={false} locale={{ emptyText: <Empty description="This user cannot access billing for any company." /> }} />
                            </SectionCard>
                        ),
                    },
                    {
                        key: 'profile', label: 'Profile',
                        children: (
                            <SectionCard title="Profile" description="Contact and preference details for this account.">
                                <Form
                                    form={profileForm} layout="vertical" disabled={!can.update}
                                    initialValues={{ ...(platformUser.profile || {}), first_name: platformUser.first_name, last_name: platformUser.last_name, phone: platformUser.phone, avatar: platformUser.avatar }}
                                    onFinish={(values) => router.put(base('central.platform-users.profile.update'), values, { preserveScroll: true })}
                                >
                                    <Row gutter={12}>
                                        <Col xs={24} md={8}><Form.Item name="first_name" label="First name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="last_name" label="Last name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="avatar" label="Avatar URL"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="job_title" label="Job title"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="company" label="Company"><Input /></Form.Item></Col>
                                        <Col xs={24} md={16}><Form.Item name="address_line_1" label="Address"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="address_line_2" label="Address line 2"><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item name="postal_code" label="Postal code"><Input /></Form.Item></Col>
                                        <Col xs={24} md={6}><Form.Item name="country" label="Country (ISO-2)"><Input maxLength={2} /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="timezone" label="Timezone"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="preferred_language" label="Preferred language"><Input /></Form.Item></Col>
                                        <Col xs={24} md={8}><Form.Item name="preferred_currency" label="Preferred currency"><Input maxLength={3} /></Form.Item></Col>
                                        <Col xs={24}><Form.Item name="bio" label="Bio"><Input.TextArea rows={3} /></Form.Item></Col>
                                    </Row>
                                    {can.update && <Button type="primary" onClick={() => profileForm.submit()}>Save profile</Button>}
                                </Form>
                            </SectionCard>
                        ),
                    },
                    {
                        key: 'security', label: 'Security',
                        children: (
                            <SectionCard title="Security" description="Only actions supported by the current authentication architecture are offered.">
                                <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered items={[
                                    { key: 'active', label: 'Account active', children: yesNo(platformUser.is_active) },
                                    { key: 'verified', label: 'Email verified', children: platformUser.email_verified_at ? formatDate(platformUser.email_verified_at, true) : 'Not verified' },
                                    { key: 'login', label: 'Last login', children: formatDate(platformUser.last_login_at, true) },
                                    { key: 'ip', label: 'Last login IP', children: platformUser.last_login_ip || '-' },
                                    { key: 'changed', label: 'Password changed', children: formatDate(platformUser.password_changed_at, true) },
                                    { key: 'forced', label: 'Password reset required', children: yesNo(platformUser.force_password_reset) },
                                ]} />
                                {can.suspend && (
                                    <Space wrap style={{ marginTop: 16 }}>
                                        <Button onClick={() => security('send_password_reset')}>Send password reset</Button>
                                        <Button onClick={() => security(platformUser.force_password_reset ? 'clear_password_reset' : 'force_password_reset')}>
                                            {platformUser.force_password_reset ? 'Clear forced reset' : 'Force password reset'}
                                        </Button>
                                        <Popconfirm title="Sign this user out of every device?" onConfirm={() => security('sign_out_sessions')}><Button>Sign out all sessions</Button></Popconfirm>
                                        {platformUser.status === 'suspended'
                                            ? <Button type="primary" onClick={() => security('activate')}>Reactivate account</Button>
                                            : <Popconfirm title="Suspend this account?" description="The user is signed out and cannot sign in again until reactivated." onConfirm={() => security('suspend')}><Button danger>Suspend user</Button></Popconfirm>}
                                    </Space>
                                )}
                            </SectionCard>
                        ),
                    },
                    {
                        key: 'activity', label: 'Activity',
                        children: (
                            <SectionCard title="Activity" description="Recorded by the central audit log.">
                                {activity.length ? (
                                    <Timeline items={activity.map((entry) => ({
                                        key: entry.id,
                                        children: (
                                            <>
                                                <strong>{humanize(entry.action)}</strong>
                                                <br />
                                                <span className="central-muted">{formatDate(entry.created_at, true)}{entry.tenant_id ? ` · ${entry.tenant_id}` : ''}{entry.ip_address ? ` · ${entry.ip_address}` : ''}</span>
                                            </>
                                        ),
                                    }))} />
                                ) : <Empty description="No recorded activity yet." />}
                            </SectionCard>
                        ),
                    },
                ]}
            />

            <Drawer
                open={assignOpen} onClose={() => setAssignOpen(false)} width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth : 600)}
                title="Assign tenant" destroyOnHidden
                extra={<Button type="primary" onClick={() => assignForm.submit()}>Assign</Button>}
            >
                {assignableTenants.length === 0 && <Alert type="info" showIcon message="This user already belongs to every tenant." style={{ marginBottom: 16 }} />}
                <Form form={assignForm} layout="vertical" onFinish={(values) => router.post(base('central.platform-users.memberships.store'), values, { preserveScroll: true, onSuccess: () => setAssignOpen(false) })}>
                    <Form.Item name="tenant_id" label="Company" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={assignableTenants.map((tenant) => ({ value: tenant.id, label: tenant.company_name }))} />
                    </Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} onChange={syncRoleDefaults(assignForm)} />
                    </Form.Item>
                    <Form.Item name="is_primary" label="Primary company" valuePropName="checked"><Switch /></Form.Item>
                    <Typography.Text type="secondary">Role defaults are applied automatically - adjust any flag below.</Typography.Text>
                    <div style={{ marginTop: 12 }}><PermissionSwitches keys={permissionKeys} /></div>
                </Form>
            </Drawer>

            <Modal
                open={Boolean(editing)} title={`Permissions · ${editing?.tenant?.company_name || ''}`} destroyOnHidden
                onCancel={() => setEditing(null)} onOk={() => membershipForm.submit()} okText="Save permissions"
            >
                <Form form={membershipForm} layout="vertical" onFinish={(values) => router.patch(base('central.platform-users.memberships.update', { membership: editing.id }), values, { preserveScroll: true, onSuccess: () => setEditing(null) })}>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} onChange={syncRoleDefaults(membershipForm)} />
                    </Form.Item>
                    <Form.Item name="is_active" label="Membership active" valuePropName="checked"><Switch /></Form.Item>
                    <PermissionSwitches keys={permissionKeys} />
                    <Typography.Text type="secondary">Owners always keep every permission. {Object.keys(PERMISSION_LABELS).length} flags are stored per membership.</Typography.Text>
                </Form>
            </Modal>

            <Drawer
                open={accountOpen} onClose={() => setAccountOpen(false)} width={Math.min(520, typeof window !== 'undefined' ? window.innerWidth : 520)}
                title="Edit user" destroyOnHidden extra={<Button type="primary" onClick={() => accountForm.submit()}>Save</Button>}
            >
                <Form form={accountForm} layout="vertical" onFinish={(values) => router.patch(base('central.platform-users.update'), values, { preserveScroll: true, onSuccess: () => setAccountOpen(false) })}>
                    <Form.Item name="first_name" label="First name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="last_name" label="Last name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email" /></Form.Item>
                    <Form.Item name="phone" label="Phone"><Input /></Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select options={statusOptions.map((status) => ({ value: status, label: humanize(status) }))} />
                    </Form.Item>
                    <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="password" label="New password" extra="Leave blank to keep the current password." rules={[{ min: 12 }]}><Input.Password autoComplete="new-password" /></Form.Item>
                    <Form.Item name="password_confirmation" label="Confirm new password"><Input.Password autoComplete="new-password" /></Form.Item>
                </Form>
            </Drawer>
        </CentralLayout>
    );
}
