import { BankOutlined, EnvironmentOutlined, GlobalOutlined, LoginOutlined, SettingOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Space, Tag } from 'antd';
import StatusBadge from '@/Components/Central/StatusBadge';
import { initials } from '@/Components/Central/formatters';
import { PortalDetailHeader, PortalDetailPanel } from '@/Components/Platform/PortalDetailHeader';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantShow({ tenant, abilities }) {
    const tabs = [
        { label: 'Overview', href: route('central.account.tenants.show', tenant.id), active: true },
        { label: 'Company details', href: route('central.account.tenants.settings', tenant.id) },
        { label: 'Members', href: route('central.account.tenants.members', tenant.id), visible: abilities.can_manage_users },
        { label: 'Billing', href: route('central.account.tenants.billing', tenant.id), visible: abilities.can_manage_billing },
    ];

    return <PlatformLayout title={tenant.company_name}>
        <PortalDetailHeader
            avatar={initials(tenant.company_name)}
            eyebrow="Organization overview"
            title={tenant.company_name}
            description={tenant.legal_name || 'Organization details and workspace access'}
            badges={<><Tag color={abilities.is_owner ? 'gold' : 'blue'}>{abilities.role_label}</Tag><StatusBadge value={tenant.status} /></>}
            backHref={route('central.account.tenants.index')}
            tabs={tabs}
            actions={<Button type="primary" icon={<LoginOutlined />} onClick={() => router.post(route('central.account.tenants.switch'), { tenant_id: tenant.id })}>Open organization</Button>}
        />

        <div className="portal-detail-grid">
            <PortalDetailPanel icon={<BankOutlined />} title="Business details" description="Registered organization information" items={[
                { label: 'Display name', value: tenant.company_name },
                { label: 'Legal name', value: tenant.legal_name || 'Not provided' },
                { label: 'Organization status', value: <StatusBadge value={tenant.status} /> },
                { label: 'Account owner', value: tenant.owner_name || 'Not provided' },
            ]} />
            <PortalDetailPanel icon={<EnvironmentOutlined />} title="Contact & location" description="Primary contact information" items={[
                { label: 'Email', value: tenant.owner_email || 'Not provided' },
                { label: 'Phone', value: tenant.owner_phone || 'Not provided' },
                { label: 'Country', value: tenant.country || 'Not provided' },
                { label: 'Address', value: tenant.address || 'Not provided' },
            ]} />
            <PortalDetailPanel icon={<SettingOutlined />} title="Workspace setup" description="Plan and localization preferences" items={[
                { label: 'Current plan', value: tenant.plan || 'No plan' },
                { label: 'Subscription', value: tenant.subscription?.status ? <StatusBadge value={tenant.subscription.status} /> : 'Not active' },
                { label: 'Timezone', value: tenant.timezone || 'Not set' },
                { label: 'Currency', value: tenant.currency || 'Not set' },
            ]} />
            <PortalDetailPanel icon={<GlobalOutlined />} title="Domains" description="Web addresses connected to this organization">
                <div className="portal-domain-list">
                    {tenant.domains?.length ? tenant.domains.map((domain) => <div key={domain.domain}><span>{domain.domain}</span><Space size={6}>{domain.is_primary && <Tag color="blue">Primary</Tag>}<StatusBadge value={domain.status || 'active'} /></Space></div>) : <span className="central-muted">No domains connected.</span>}
                </div>
            </PortalDetailPanel>
        </div>
    </PlatformLayout>;
}
