import { router } from '@inertiajs/react';
import { Alert, Button, Col, Descriptions, Empty, Modal, Popconfirm, Radio, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import PageHeader from '@/Components/Central/PageHeader';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import { formatDate, formatMoney } from '@/Components/Central/formatters';
import PlatformLayout from '@/Layouts/PlatformLayout';

export default function PlatformTenantBilling({ tenant, abilities, subscription, plans, usage, invoices, payments }) {
    const [planChange, setPlanChange] = useState(null);
    const [timing, setTiming] = useState('period_end');
    const currency = subscription?.plan?.currency || tenant.currency || 'USD';

    const invoiceColumns = [
        { title: 'Invoice', dataIndex: 'invoice_number' },
        { title: 'Issued', dataIndex: 'issue_date', responsive: ['md'], render: (value) => formatDate(value) },
        { title: 'Due', dataIndex: 'due_date', responsive: ['md'], render: (value) => formatDate(value) },
        { title: 'Total', dataIndex: 'total', align: 'right', render: (value, row) => formatMoney(value, row.currency) },
        { title: 'Balance', dataIndex: 'balance', align: 'right', render: (value, row) => formatMoney(value, row.currency) },
        { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value} /> },
        {
            title: '', key: 'actions', width: 150,
            render: (_, row) => (
                <Space size={4}>
                    <Button size="small" onClick={() => router.visit(route('central.account.tenants.billing.invoice', { tenant: tenant.id, invoice: row.id }))}>View</Button>
                    {abilities.can_make_payments && !['paid', 'void'].includes(row.status) && (
                        <Button size="small" type="primary" onClick={() => router.post(route('central.account.tenants.billing.invoice.pay', { tenant: tenant.id, invoice: row.id }))}>Pay</Button>
                    )}
                </Space>
            ),
        },
    ];

    const paymentColumns = [
        { title: 'Invoice', key: 'invoice', render: (_, row) => row.invoice?.invoice_number || '-' },
        { title: 'Gateway', dataIndex: 'gateway' },
        { title: 'Method', dataIndex: 'payment_method', responsive: ['md'], render: (value) => value || '-' },
        { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value, row) => formatMoney(value, row.currency) },
        { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge value={value} /> },
        { title: 'Paid', dataIndex: 'paid_at', render: (value) => formatDate(value, true) },
    ];

    const usageItems = usage ? [
        ['Users', usage.users_count], ['Branches', usage.branches_count], ['Products', usage.products_count],
        ['Customers', usage.customers_count], ['Invoices this month', usage.invoices_count], ['AI requests', usage.ai_requests_count],
    ] : [];

    return (
        <PlatformLayout title={`${tenant.company_name} · Billing`}>
            <PageHeader eyebrow={tenant.company_name} title="Billing" description="Subscription, invoices and payments for this company only." />

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={14}>
                    <SectionCard title="Subscription">
                        {subscription ? (
                            <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered items={[
                                { key: 'plan', label: 'Current plan', children: subscription.plan?.name || '-' },
                                { key: 'status', label: 'Status', children: <StatusBadge value={subscription.status} /> },
                                { key: 'cycle', label: 'Billing cycle', children: subscription.billing_cycle },
                                { key: 'renew', label: 'Next renewal', children: formatDate(subscription.current_period_ends_at) },
                                { key: 'trial', label: 'Trial ends', children: subscription.trial_ends_at ? formatDate(subscription.trial_ends_at) : '-' },
                                { key: 'scheduled', label: 'Scheduled change', children: subscription.scheduled_plan_id ? `Plan #${subscription.scheduled_plan_id} on ${formatDate(subscription.scheduled_change_at)}` : 'None' },
                            ]} />
                        ) : <Empty description="No subscription has been started for this company." />}
                        {abilities.can_manage_plan && subscription && (
                            <Space wrap style={{ marginTop: 16 }}>
                                <Popconfirm title="Cancel at period end?" description="Access continues until the current billing period closes." onConfirm={() => router.post(route('central.account.tenants.billing.plan.cancel', tenant.id), { confirm: true }, { preserveScroll: true })}>
                                    <Button danger>Cancel subscription</Button>
                                </Popconfirm>
                                <Button onClick={() => router.post(route('central.account.tenants.billing.plan.resume', tenant.id), {}, { preserveScroll: true })}>Resume subscription</Button>
                            </Space>
                        )}
                    </SectionCard>
                </Col>
                <Col xs={24} lg={10}>
                    <SectionCard title="Usage" description={usage ? `Period ${formatDate(usage.period_start)} – ${formatDate(usage.period_end)}` : undefined}>
                        {usage ? (
                            <Row gutter={[12, 12]}>
                                {usageItems.map(([label, value]) => <Col xs={12} key={label}><Statistic title={label} value={value ?? 0} /></Col>)}
                            </Row>
                        ) : <Empty description="Usage has not been measured yet." />}
                    </SectionCard>
                </Col>
            </Row>

            {abilities.can_manage_plan && plans.length > 0 && (
                <SectionCard title="Available plans" description="Compare and request a plan change." style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 16]}>
                        {plans.map((plan) => (
                            <Col xs={24} md={12} xl={8} key={plan.id}>
                                <SectionCard
                                    title={<Space>{plan.name}{subscription?.plan_id === plan.id && <Tag color="green">Current</Tag>}</Space>}
                                    extra={subscription?.plan_id !== plan.id ? <Button size="small" type="primary" onClick={() => setPlanChange(plan)}>Choose</Button> : null}
                                >
                                    <Typography.Paragraph type="secondary">{plan.description || '-'}</Typography.Paragraph>
                                    <Space direction="vertical" size={2}>
                                        <Typography.Text strong>{formatMoney(plan.price_monthly, plan.currency)} / month</Typography.Text>
                                        <Typography.Text type="secondary">{formatMoney(plan.price_yearly, plan.currency)} / year</Typography.Text>
                                        <Typography.Text type="secondary">Users: {plan.max_users ?? 'Unlimited'} · Branches: {plan.max_branches ?? 'Unlimited'}</Typography.Text>
                                    </Space>
                                </SectionCard>
                            </Col>
                        ))}
                    </Row>
                </SectionCard>
            )}

            {abilities.can_view_invoices ? (
                <SectionCard>
                    <Tabs
                        items={[
                            {
                                key: 'invoices', label: 'Invoices',
                                children: <Table rowKey="id" size="middle" scroll={{ x: 780 }} dataSource={invoices?.data || []} columns={invoiceColumns}
                                    locale={{ emptyText: <Empty description="No invoices yet." /> }}
                                    pagination={invoices ? { current: invoices.current_page, total: invoices.total, pageSize: invoices.per_page, showSizeChanger: false, onChange: (page) => router.get(route('central.account.tenants.billing', tenant.id), { invoices: page }, { preserveState: true, preserveScroll: true }) } : false} />,
                            },
                            {
                                key: 'payments', label: 'Payments',
                                children: <Table rowKey="id" size="middle" scroll={{ x: 700 }} dataSource={payments?.data || []} columns={paymentColumns}
                                    locale={{ emptyText: <Empty description="No payments recorded." /> }}
                                    pagination={payments ? { current: payments.current_page, total: payments.total, pageSize: payments.per_page, showSizeChanger: false, onChange: (page) => router.get(route('central.account.tenants.billing', tenant.id), { payments: page }, { preserveState: true, preserveScroll: true }) } : false} />,
                            },
                        ]}
                    />
                </SectionCard>
            ) : (
                <Alert type="info" showIcon message="You do not have permission to view invoices for this company." />
            )}

            <Modal
                open={Boolean(planChange)} title={`Change plan to ${planChange?.name || ''}`} destroyOnHidden okText="Confirm plan change"
                onCancel={() => setPlanChange(null)}
                onOk={() => router.post(route('central.account.tenants.billing.plan.change', tenant.id), { plan_id: planChange.id, timing }, { preserveScroll: true, onSuccess: () => setPlanChange(null) })}
            >
                <Alert type="warning" showIcon message="This changes what you are billed." description="An immediate change applies right away with a remaining-time credit. A scheduled change takes effect when the current period ends." style={{ marginBottom: 16 }} />
                <Descriptions column={1} size="small" items={[
                    { key: 'from', label: 'Current plan', children: subscription?.plan?.name || '-' },
                    { key: 'to', label: 'New plan', children: planChange?.name },
                    { key: 'price', label: 'Price', children: planChange ? `${formatMoney(planChange.price_monthly, planChange.currency || currency)} / month` : '-' },
                    { key: 'effective', label: 'Effective', children: timing === 'immediate' ? 'Immediately' : formatDate(subscription?.current_period_ends_at) },
                ]} />
                <Radio.Group value={timing} onChange={(event) => setTiming(event.target.value)} style={{ marginTop: 16 }}>
                    <Radio value="period_end">At the end of the current period</Radio>
                    <Radio value="immediate">Immediately</Radio>
                </Radio.Group>
            </Modal>
        </PlatformLayout>
    );
}
