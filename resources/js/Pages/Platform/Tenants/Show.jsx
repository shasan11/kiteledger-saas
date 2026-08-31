import { CreditCardOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { Button, Col, Descriptions, Row, Space, Statistic, Tag } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantShow({ tenant, abilities, memberCount }) {
    return (
        <PlatformLayout title={tenant.company_name}>
            <PageHeader
                eyebrow="Company"
                title={tenant.company_name}
                description={tenant.legal_name || undefined}
                actions={(
                    <Space wrap>
                        <Button icon={<SettingOutlined />} onClick={() => router.visit(route('central.account.tenants.settings', tenant.id))}>Company</Button>
                        {abilities.can_manage_users && <Button icon={<TeamOutlined />} onClick={() => router.visit(route('central.account.tenants.members', tenant.id))}>Members</Button>}
                        {abilities.can_manage_billing && <Button type="primary" icon={<CreditCardOutlined />} onClick={() => router.visit(route('central.account.tenants.billing', tenant.id))}>Billing</Button>}
                    </Space>
                )}
            >
                <Space style={{ marginTop: 12 }} wrap>
                    <Tag color={abilities.is_owner ? 'gold' : 'blue'}>{abilities.role_label}</Tag>
                    <StatusBadge value={tenant.status} />
                </Space>
            </PageHeader>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={8}><SectionCard><Statistic title="Plan" value={tenant.plan || 'None'} /></SectionCard></Col>
                <Col xs={12} md={8}><SectionCard><Statistic title="Members" value={memberCount} /></SectionCard></Col>
                <Col xs={24} md={8}><SectionCard><Statistic title="Renews" value={tenant.subscription?.current_period_ends_at ? formatDate(tenant.subscription.current_period_ends_at) : '-'} /></SectionCard></Col>
            </Row>

            <SectionCard title="Company details">
                <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered items={[
                    { key: 'company', label: 'Company name', children: tenant.company_name },
                    { key: 'legal', label: 'Legal name', children: tenant.legal_name || '-' },
                    { key: 'owner', label: 'Owner', children: tenant.owner_name || '-' },
                    { key: 'email', label: 'Owner email', children: tenant.owner_email || '-' },
                    { key: 'phone', label: 'Owner phone', children: tenant.owner_phone || '-' },
                    { key: 'country', label: 'Country', children: tenant.country || '-' },
                    { key: 'address', label: 'Address', children: tenant.address || '-' },
                    { key: 'timezone', label: 'Timezone', children: tenant.timezone || '-' },
                    { key: 'currency', label: 'Currency', children: tenant.currency || '-' },
                    { key: 'domains', label: 'Domains', children: tenant.domains?.length ? <Space wrap>{tenant.domains.map((domain) => <Tag key={domain.domain} color={domain.is_primary ? 'blue' : 'default'}>{domain.domain}</Tag>)}</Space> : '-' },
                    { key: 'subscription', label: 'Subscription', children: tenant.subscription?.status ? <StatusBadge value={tenant.subscription.status} /> : 'None' },
                ]} />
            </SectionCard>
        </PlatformLayout>
    );
}
