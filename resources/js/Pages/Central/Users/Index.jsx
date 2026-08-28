import { PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Avatar, Button, Col, DatePicker, Drawer, Empty, Form, Input, Row, Select, Space, Statistic, Switch, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import PermissionSwitches from '@/Components/Platform/PermissionSwitches';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, humanize, initials } from '@/Components/Central/formatters';
import CentralLayout from '@/Layouts/CentralLayout';

const roleColor = { owner: 'gold', administrator: 'blue', billing_manager: 'purple', member: 'default', viewer: 'default' };

export default function PlatformUsersIndex({ users, filters, stats, tenantOptions, roleOptions, statusOptions, can }) {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const [query, setQuery] = useState(filters.search || '');
    const roleDefaults = useMemo(() => Object.fromEntries(roleOptions.map((role) => [role.value, role.permissions])), [roleOptions]);

    const applyFilters = (changes) => router.get(route('central.platform-users.index'), { ...filters, ...changes, page: 1 }, { preserveState: true, replace: true });

    const openDrawer = () => {
        form.resetFields();
        form.setFieldsValue({ is_active: true, send_invitation: false, memberships: [] });
        setOpen(true);
    };

    const submit = (values) => router.post(route('central.platform-users.store'), values, { preserveScroll: true, onSuccess: () => setOpen(false) });

    const applyRoleDefaults = (index, role) => {
        const memberships = form.getFieldValue('memberships') || [];
        memberships[index] = { ...memberships[index], role, permissions: { ...(roleDefaults[role] || {}) } };
        form.setFieldsValue({ memberships });
    };

    const columns = [
        {
            title: 'User', key: 'user', fixed: 'left', width: 260,
            render: (_, row) => (
                <Space>
                    <Avatar src={row.avatar || undefined}>{initials(row.name)}</Avatar>
                    <span>
                        <strong>{row.name}</strong>
                        <br />
                        <span className="central-muted">{row.email}</span>
                    </span>
                </Space>
            ),
        },
        { title: 'Email', dataIndex: 'email', responsive: ['xxl'] },
        {
            title: 'Company access', key: 'tenants', width: 260,
            render: (_, row) => {
                const memberships = row.tenant_memberships || [];
                if (!memberships.length) return <span className="central-muted">No companies</span>;
                const shown = memberships.slice(0, 2);
                return (
                    <Space size={4} wrap>
                        {shown.map((membership) => (
                            <Tag key={membership.id} color={roleColor[membership.role] || 'default'}>{membership.tenant?.company_name || membership.tenant_id}</Tag>
                        ))}
                        {memberships.length > shown.length && (
                            <Tooltip title={memberships.slice(2).map((membership) => membership.tenant?.company_name).join(', ')}>
                                <Tag>+{memberships.length - shown.length} more</Tag>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Primary company', key: 'primary', responsive: ['lg'],
            render: (_, row) => (row.tenant_memberships || []).find((membership) => membership.is_primary)?.tenant?.company_name || <span className="central-muted">-</span>,
        },
        { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <StatusBadge value={value} /> },
        { title: 'Last active', dataIndex: 'last_active_at', responsive: ['lg'], render: (value) => formatDate(value, true) },
        { title: 'Created', dataIndex: 'created_at', responsive: ['xl'], render: (value) => formatDate(value) },
        { title: '', key: 'actions', width: 90, render: (_, row) => <Button size="small" onClick={() => router.visit(route('central.platform-users.show', row.id))}>Open</Button> },
    ];

    return (
        <CentralLayout title="Platform Users">
            <PageHeader
                eyebrow="Administration"
                title="Platform Users"
                description="Manage customer accounts and their access to KiteLedger tenants."
                actions={can.create ? <Button type="primary" icon={<PlusOutlined />} onClick={openDrawer}>Add user</Button> : null}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {[['Total users', stats.total], ['Active', stats.active], ['Invited', stats.invited], ['Suspended', stats.suspended]].map(([label, value]) => (
                    <Col xs={12} lg={6} key={label}>
                        <SectionCard><Statistic title={label} value={value} prefix={<TeamOutlined />} /></SectionCard>
                    </Col>
                ))}
            </Row>

            <SectionCard>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <Input.Search
                            allowClear placeholder="Search name, email, phone or company" prefix={<SearchOutlined />}
                            value={query} onChange={(event) => setQuery(event.target.value)} onSearch={(value) => applyFilters({ search: value })}
                        />
                    </Col>
                    <Col xs={12} md={4}>
                        <Select allowClear style={{ width: '100%' }} placeholder="Status" value={filters.status || undefined}
                            onChange={(value) => applyFilters({ status: value ?? null })}
                            options={statusOptions.map((status) => ({ value: status, label: humanize(status) }))} />
                    </Col>
                    <Col xs={12} md={5}>
                        <Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Company" value={filters.tenant_id || undefined}
                            onChange={(value) => applyFilters({ tenant_id: value ?? null })}
                            options={tenantOptions.map((tenant) => ({ value: tenant.id, label: tenant.company_name }))} />
                    </Col>
                    <Col xs={12} md={4}>
                        <Select allowClear style={{ width: '100%' }} placeholder="Role" value={filters.role || undefined}
                            onChange={(value) => applyFilters({ role: value ?? null })}
                            options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} />
                    </Col>
                    <Col xs={12} md={3}>
                        <DatePicker.RangePicker
                            style={{ width: '100%' }}
                            value={filters.created_from && filters.created_to ? [dayjs(filters.created_from), dayjs(filters.created_to)] : null}
                            onChange={(range) => applyFilters({ created_from: range?.[0]?.format('YYYY-MM-DD') ?? null, created_to: range?.[1]?.format('YYYY-MM-DD') ?? null })}
                        />
                    </Col>
                </Row>

                <Table
                    rowKey="id" dataSource={users.data} columns={columns} scroll={{ x: 960 }} size="middle"
                    locale={{ emptyText: <Empty description="No platform users match these filters." /> }}
                    pagination={{
                        current: users.current_page, total: users.total, pageSize: users.per_page, showSizeChanger: false,
                        onChange: (page) => router.get(route('central.platform-users.index'), { ...filters, page }, { preserveState: true }),
                    }}
                />
            </SectionCard>

            <Drawer
                open={open} onClose={() => setOpen(false)} width={Math.min(720, typeof window !== 'undefined' ? window.innerWidth : 720)}
                title="Add platform user" destroyOnHidden
                extra={<Space><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" onClick={() => form.submit()}>Create user</Button></Space>}
            >
                <Form form={form} layout="vertical" onFinish={submit}>
                    <SectionCard title="Account" style={{ marginBottom: 16 }}>
                        <Row gutter={12}>
                            <Col xs={24} sm={12}><Form.Item name="first_name" label="First name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="last_name" label="Last name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        </Row>
                        <Row gutter={12}>
                            <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                        </Row>
                        <Form.Item name="send_invitation" label="Send an invitation instead of setting a password" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item noStyle shouldUpdate={(prev, next) => prev.send_invitation !== next.send_invitation}>
                            {({ getFieldValue }) => getFieldValue('send_invitation') ? null : (
                                <Row gutter={12}>
                                    <Col xs={24} sm={12}><Form.Item name="password" label="Password" rules={[{ required: true }, { min: 12 }]}><Input.Password autoComplete="new-password" /></Form.Item></Col>
                                    <Col xs={24} sm={12}><Form.Item name="password_confirmation" label="Confirm password" dependencies={['password']} rules={[{ required: true }]}><Input.Password autoComplete="new-password" /></Form.Item></Col>
                                </Row>
                            )}
                        </Form.Item>
                        <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
                    </SectionCard>

                    <SectionCard title="Company access" description="Grant the account access to one or more tenants.">
                        <Form.List name="memberships">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map((field, index) => (
                                        <SectionCard key={field.key} style={{ marginBottom: 12 }} extra={<Button danger size="small" onClick={() => remove(field.name)}>Remove</Button>}>
                                            <Row gutter={12}>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item name={[field.name, 'tenant_id']} label="Company" rules={[{ required: true }]}>
                                                        <Select showSearch optionFilterProp="label" options={tenantOptions.map((tenant) => ({ value: tenant.id, label: tenant.company_name }))} />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item name={[field.name, 'role']} label="Role" rules={[{ required: true }]}>
                                                        <Select options={roleOptions.map((role) => ({ value: role.value, label: role.label }))} onChange={(value) => applyRoleDefaults(field.name, value)} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name={[field.name, 'is_primary']} label="Primary company" valuePropName="checked"><Switch size="small" /></Form.Item>
                                            <PermissionSwitches namePrefix={[field.name, 'permissions']} />
                                        </SectionCard>
                                    ))}
                                    <Button block icon={<PlusOutlined />} onClick={() => add({ role: 'member', permissions: { ...(roleDefaults.member || {}) } })}>Add company access</Button>
                                </>
                            )}
                        </Form.List>
                    </SectionCard>
                </Form>
            </Drawer>
        </CentralLayout>
    );
}
