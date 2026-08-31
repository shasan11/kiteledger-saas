import { AppstoreOutlined, CreditCardOutlined, LoginOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Input, Segmented, Space, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, initials } from '@/Components/Central/formatters';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantsIndex({ tenants }) {
    const [query, setQuery] = useState('');
    const [view, setView] = useState('table');
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return tenants;
        return tenants.filter((tenant) => [tenant.company_name, tenant.plan, tenant.role_label, tenant.status, tenant.subscription_status].some((value) => String(value || '').toLowerCase().includes(needle)));
    }, [query, tenants]);

    const openOrganization = (tenant) => router.post(route('central.account.tenants.switch'), { tenant_id: tenant.id });
    const columns = [
        {
            title: 'Organization', key: 'organization',
            render: (_, tenant) => <div className="portal-table-organization"><span className="portal-table-organization__avatar">{initials(tenant.company_name)}</span><button type="button" onClick={() => router.visit(route('central.account.tenants.show', tenant.id))}><strong>{tenant.company_name}</strong><span>{tenant.is_primary ? 'Primary organization' : tenant.role_label}</span></button></div>,
        },
        { title: 'Plan', dataIndex: 'plan', render: (value) => value || 'No plan' },
        { title: 'Subscription', dataIndex: 'subscription_status', render: (value) => value ? <StatusBadge value={value} dot /> : 'Not active' },
        { title: 'Renews', dataIndex: 'renews_at', render: (value) => value ? formatDate(value) : 'Not scheduled' },
        { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value} /> },
        {
            title: '', key: 'actions', align: 'right',
            render: (_, tenant) => <Space><Button type="primary" icon={<LoginOutlined />} onClick={() => openOrganization(tenant)}>Open</Button>{tenant.can_manage_billing && <Button icon={<CreditCardOutlined />} onClick={() => router.visit(route('central.account.tenants.billing', tenant.id))}>Billing</Button>}</Space>,
        },
    ];

    return <PlatformLayout title="Organizations">
        <PortalSection
            title="Organization List"
            description={`${filtered.length} of ${tenants.length} organization${tenants.length === 1 ? '' : 's'}`}
            action={<div className="portal-organization-tools">
                <Input allowClear prefix={<SearchOutlined />} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organizations" aria-label="Search organizations" />
                <Segmented className="portal-view-switch" value={view} onChange={setView} aria-label="Organization view" options={[
                    { value: 'table', label: <UnorderedListOutlined />, title: 'Table view' },
                    { value: 'box', label: <AppstoreOutlined />, title: 'Box view' },
                ]} />
            </div>}
        >
            {view === 'table' ? <div className="portal-organization-table"><Table rowKey="id" columns={columns} dataSource={filtered} pagination={false} scroll={{ x: 900 }} locale={{ emptyText: query ? 'No organizations match your search.' : 'No organizations are connected to your account.' }} /></div> : <div className="portal-organization-grid"><PortalList emptyText={query ? 'No organizations match your search.' : 'No organizations are connected to your account.'}>{filtered.map((tenant) => <PortalListCard
                key={tenant.id}
                avatar={initials(tenant.company_name)}
                title={tenant.company_name}
                subtitle={tenant.is_primary ? 'Your primary organization' : 'Connected organization'}
                badges={<>{tenant.is_primary && <Tag color="green">Primary</Tag>}<Tag color={tenant.role === 'owner' ? 'gold' : 'blue'}>{tenant.role_label}</Tag><StatusBadge value={tenant.status} /></>}
                meta={[
                    { label: 'Plan', value: tenant.plan || 'No plan' },
                    { label: 'Subscription', value: tenant.subscription_status ? <StatusBadge value={tenant.subscription_status} dot /> : 'Not active' },
                    { label: 'Next renewal', value: tenant.renews_at ? formatDate(tenant.renews_at) : 'Not scheduled' },
                    { label: 'Currency', value: tenant.currency || '-' },
                ]}
                onClick={() => router.visit(route('central.account.tenants.show', tenant.id))}
                actions={<Space wrap><Button type="primary" icon={<LoginOutlined />} onClick={() => openOrganization(tenant)}>Open</Button>{tenant.can_manage_billing && <Button icon={<CreditCardOutlined />} onClick={() => router.visit(route('central.account.tenants.billing', tenant.id))}>Billing</Button>}</Space>}
            />)}</PortalList></div>}
        </PortalSection>
    </PlatformLayout>;
}
