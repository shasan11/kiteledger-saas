import { CreditCardOutlined, LoginOutlined } from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { Avatar, Button, Card, Col, Empty, Row, Space, Statistic, Tag, Typography } from 'antd';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, initials } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformDashboard({ tenants, summary }) {
    const user = usePage().props.auth?.user;

    return (
        <PlatformLayout title="Overview">
            <PageHeader eyebrow="Your account" title={`Welcome back, ${user?.first_name || user?.name || ''}`} description="Every company you have been given access to." />

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {[['Companies', summary.companies], ['Owned by you', summary.owned], ['Billing access', summary.billing]].map(([label, value]) => (
                    <Col xs={24} sm={8} key={label}><SectionCard><Statistic title={label} value={value} /></SectionCard></Col>
                ))}
            </Row>

            <Typography.Title level={4}>Your companies</Typography.Title>
            {tenants.length === 0 ? (
                <SectionCard><Empty description="You do not have access to any company yet. Ask a company owner to invite you." /></SectionCard>
            ) : (
                <Row gutter={[16, 16]}>
                    {tenants.map((tenant) => (
                        <Col xs={24} md={12} xl={8} key={tenant.id}>
                            <Card
                                title={<Space><Avatar>{initials(tenant.company_name)}</Avatar><span>{tenant.company_name}</span></Space>}
                                extra={tenant.is_primary ? <Tag color="green">Primary</Tag> : null}
                                actions={[
                                    <Button key="open" type="link" icon={<LoginOutlined />} onClick={() => router.post(route('central.account.tenants.switch'), { tenant_id: tenant.id })}>Open company</Button>,
                                    tenant.can_manage_billing
                                        ? <Button key="billing" type="link" icon={<CreditCardOutlined />} onClick={() => router.visit(route('central.account.tenants.billing', tenant.id))}>Manage billing</Button>
                                        : <Typography.Text key="billing" type="secondary">No billing access</Typography.Text>,
                                ]}
                            >
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    <Space wrap>
                                        <Tag color={tenant.role === 'owner' ? 'gold' : 'blue'}>{tenant.role_label}</Tag>
                                        <StatusBadge value={tenant.status} />
                                    </Space>
                                    <Typography.Text type="secondary">Plan: <strong>{tenant.plan || 'No plan'}</strong></Typography.Text>
                                    <Typography.Text type="secondary">Subscription: {tenant.subscription_status ? <StatusBadge value={tenant.subscription_status} dot /> : 'None'}</Typography.Text>
                                    {tenant.renews_at && <Typography.Text type="secondary">Renews {formatDate(tenant.renews_at)}</Typography.Text>}
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </PlatformLayout>
    );
}
