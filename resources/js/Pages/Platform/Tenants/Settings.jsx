import { router } from '@inertiajs/react';
import { Alert, Button, Col, Descriptions, Form, Input, Row, Space, Tag } from 'antd';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { initials } from '@/Components/Central/formatters';
import { PortalDetailHeader } from '@/Components/Platform/PortalDetailHeader';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantSettings({ tenant, abilities }) {
    const [form] = Form.useForm();
    const editable = abilities.can_manage_company;

    return (
        <PlatformLayout title={`${tenant.company_name} · Company`}>
            <PortalDetailHeader
                avatar={initials(tenant.company_name)}
                eyebrow={tenant.company_name}
                title="Company details"
                description="Business information used across invoices and documents."
                badges={<StatusBadge value={tenant.status} />}
                backHref={route('central.account.tenants.index')}
                tabs={[
                    { label: 'Overview', href: route('central.account.tenants.show', tenant.id) },
                    { label: 'Company details', href: route('central.account.tenants.settings', tenant.id), active: true },
                    { label: 'Members', href: route('central.account.tenants.members', tenant.id), visible: abilities.can_manage_users },
                    { label: 'Billing', href: route('central.account.tenants.billing', tenant.id), visible: abilities.can_manage_billing },
                ]}
            />

            {!editable && <Alert type="info" showIcon message="You have read-only access to these company details." style={{ marginBottom: 16 }} />}

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <SectionCard title="Business details">
                        <Form form={form} layout="vertical" initialValues={tenant} disabled={!editable} onFinish={(values) => router.put(route('central.account.tenants.settings.update', tenant.id), values, { preserveScroll: true })}>
                            <Row gutter={12}>
                                <Col xs={24} md={12}><Form.Item name="company_name" label="Company name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="legal_name" label="Legal name"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="owner_name" label="Owner name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="owner_email" label="Owner email" rules={[{ required: true, type: 'email' }]}><Input type="email" /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="owner_phone" label="Owner phone"><Input /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="country" label="Country (ISO-2)"><Input maxLength={2} /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item name="timezone" label="Timezone"><Input /></Form.Item></Col>
                                <Col xs={24}><Form.Item name="address" label="Address"><Input.TextArea rows={3} /></Form.Item></Col>
                            </Row>
                            {editable && <Button type="primary" onClick={() => form.submit()}>Save company details</Button>}
                        </Form>
                    </SectionCard>
                </Col>
                <Col xs={24} lg={10}>
                    <SectionCard title="Plan and status" description="Managed from the Billing screen.">
                        <Descriptions column={1} size="small" bordered items={[
                            { key: 'status', label: 'Company status', children: <StatusBadge value={tenant.status} /> },
                            { key: 'currency', label: 'Currency', children: tenant.currency || '-' },
                            { key: 'plan', label: 'Current plan', children: tenant.plan || 'None' },
                            { key: 'subscription', label: 'Subscription', children: tenant.subscription?.status ? <StatusBadge value={tenant.subscription.status} /> : 'None' },
                            { key: 'domains', label: 'Domains', children: tenant.domains?.length ? <Space wrap>{tenant.domains.map((domain) => <Tag key={domain.domain}>{domain.domain}</Tag>)}</Space> : '-' },
                        ]} />
                    </SectionCard>
                </Col>
            </Row>
        </PlatformLayout>
    );
}
