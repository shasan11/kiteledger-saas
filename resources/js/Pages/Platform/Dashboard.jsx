import { CreditCardOutlined, LoginOutlined, ShopOutlined } from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { Button, Space, Tag } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, initials } from '@/Components/Central/formatters';
import { PortalList, PortalListCard, PortalSection } from '@/Components/Platform/PortalListCard';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformDashboard({ tenants }) {
    const user = usePage().props.auth?.user;
    return <PlatformLayout title="Organizations">
        <PageHeader title={`Hello, ${user?.first_name || user?.name || 'there'}`} />
        <PortalSection title="Your organizations">
            <PortalList emptyText="You do not have access to an organization yet.">{tenants.map((tenant) => <PortalListCard
                key={tenant.id}
                avatar={initials(tenant.company_name)}
                icon={<ShopOutlined />}
                title={tenant.company_name}
                subtitle={tenant.is_primary ? 'Your primary organization' : 'Connected organization'}
                badges={<>{tenant.is_primary && <Tag color="green">Primary</Tag>}<Tag color={tenant.role === 'owner' ? 'gold' : 'blue'}>{tenant.role_label}</Tag><StatusBadge value={tenant.status} /></>}
                meta={[
                    { label: 'Plan', value: tenant.plan || 'No plan' },
                    { label: 'Subscription', value: tenant.subscription_status ? <StatusBadge value={tenant.subscription_status} dot /> : 'Not active' },
                    { label: 'Next renewal', value: tenant.renews_at ? formatDate(tenant.renews_at) : 'Not scheduled' },
                    { label: 'Currency', value: tenant.currency || '-' },
                ]}
                actions={<Space wrap><Button icon={<LoginOutlined />} type="primary" onClick={() => router.post(route('central.account.tenants.switch'), { tenant_id: tenant.id })}>Open</Button>{tenant.can_manage_billing && <Button icon={<CreditCardOutlined />} onClick={() => router.visit(route('central.account.tenants.billing', tenant.id))}>Billing</Button>}</Space>}
            />)}</PortalList>
        </PortalSection>
    </PlatformLayout>;
}
