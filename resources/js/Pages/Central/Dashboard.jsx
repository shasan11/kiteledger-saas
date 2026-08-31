import CentralLayout from '@/Layouts/CentralLayout';
import MetricCard from '@/Components/Central/MetricCard';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import TenantIdentity from '@/Components/Central/TenantIdentity';
import { formatDate, formatMoney, humanize } from '@/Components/Central/formatters';
import { router, usePage } from '@inertiajs/react';
import {
    AlertOutlined, ArrowRightOutlined, CreditCardOutlined, DollarOutlined,
    PlusOutlined, RiseOutlined, TeamOutlined, WarningOutlined,
} from '@ant-design/icons';
import { Button, Col, Empty, Row, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const CHART_HEIGHT = 270;
const GRID_STROKE = '#e5e7eb';
const TOOLTIP_STYLE = {
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    boxShadow: '0 8px 28px rgba(15,23,42,.08)',
    fontSize: 12,
};

export default function Dashboard({
    metrics = {},
    financials = {},
    recentTenants = [],
    recentPayments = [],
    urgentTickets = [],
    provisioningFunnel = [],
    planDistribution = [],
    attention = [],
    health = [],
    activity = [],
}) {
    const user = usePage().props?.auth?.user;
    const firstName = (user?.name || 'Administrator').split(' ')[0];
    const revenueCurrencies = financials.revenue || [];
    const [revenueCurrency, setRevenueCurrency] = useState(revenueCurrencies[0]?.currency || 'USD');
    const selectedRevenue = revenueCurrencies.find((item) => item.currency === revenueCurrency) || { total: 0, trend: [] };
    const formatCurrencyTotals = (items, valueKey) => items?.length
        ? items.map((item) => formatMoney(item[valueKey], item.currency, true)).join(' · ')
        : formatMoney(0, 'USD', true);

    const plans = planDistribution.map((item) => ({ name: item.plan?.name || 'No plan', tenants: Number(item.total) }));
    const customerStatus = [
        { status: 'Active', customers: Number(metrics.activeTenants || 0) },
        { status: 'Trial', customers: Number(metrics.trialTenants || 0) },
        { status: 'Suspended', customers: Number(metrics.suspendedTenants || 0) },
        { status: 'Expired', customers: Number(metrics.expiredTenants || 0) },
        { status: 'New signups', customers: Number(metrics.newSignups || 0) },
    ];

    const empty = (description) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />;

    const columns = [
        { title: 'Customer', render: (_, tenant) => <TenantIdentity tenant={tenant} /> },
        { title: 'Plan', render: (_, tenant) => tenant.plan?.name || 'No plan' },
        { title: 'Status', render: (_, tenant) => <StatusBadge value={tenant.status} /> },
        { title: 'Created', render: (_, tenant) => formatDate(tenant.created_at) },
        {
            title: '',
            width: 56,
            render: (_, tenant) => (
                <Button
                    type="text"
                    icon={<ArrowRightOutlined />}
                    aria-label="Open tenant"
                    onClick={() => router.visit(route('central.tenants.show', tenant.id))}
                />
            ),
        },
    ];

    return (
        <CentralLayout title="Home">
            <div className="central-dashboard">
                <section className="central-hero">
                    <div className="central-hero__content">
                        <div>
                            <Typography.Title level={2}>Good to see you, {firstName}.</Typography.Title>
                            <Typography.Paragraph type="secondary">
                                Here is the operating picture across customers, revenue, billing, and infrastructure.
                            </Typography.Paragraph>
                        </div>
                        <div className="central-hero__actions">
                            <Button onClick={() => router.visit(route('central.provisioning-logs.index'))}>View operations</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.visit(route('central.tenants.create'))}>
                                Create customer
                            </Button>
                        </div>
                    </div>
                </section>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} xl={6}>
                        <MetricCard
                            label="Monthly recurring revenue"
                            value={formatCurrencyTotals(financials.recurring, 'mrr')}
                            helper={`${formatCurrencyTotals(financials.recurring, 'arr')} ARR`}
                            icon={<DollarOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <MetricCard
                            label="Active customers"
                            value={Number(metrics.activeTenants || 0).toLocaleString()}
                            helper={`${metrics.totalTenants || 0} total customers`}
                            icon={<TeamOutlined />}
                            tone="blue"
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <MetricCard
                            label="New signups"
                            value={Number(metrics.newSignups || 0).toLocaleString()}
                            trend={metrics.signupGrowth}
                            helper="vs previous month"
                            icon={<RiseOutlined />}
                            tone="violet"
                        />
                    </Col>
                    <Col xs={24} sm={12} xl={6}>
                        <MetricCard
                            label="Outstanding balance"
                            value={formatCurrencyTotals(financials.outstanding, 'amount')}
                            helper={`${metrics.failedPayments || 0} failed payments`}
                            icon={<CreditCardOutlined />}
                            tone={metrics.failedPayments ? 'rose' : 'amber'}
                        />
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} xl={16}>
                        <SectionCard
                            title="Revenue momentum"
                            description="Net successful payments after refunds over the last 12 months"
                            extra={
                                <Space>
                                    <Typography.Text strong>{formatMoney(selectedRevenue.total, revenueCurrency, true)} lifetime</Typography.Text>
                                    {revenueCurrencies.length > 1 && (
                                        <Select
                                            size="small"
                                            value={revenueCurrency}
                                            onChange={setRevenueCurrency}
                                            options={revenueCurrencies.map((item) => ({ value: item.currency, label: item.currency }))}
                                        />
                                    )}
                                </Space>
                            }
                        >
                            {selectedRevenue.trend?.length ? (
                                <ResponsiveContainer className="central-chart" width="100%" height={CHART_HEIGHT}>
                                    <AreaChart data={selectedRevenue.trend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} width={70} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatMoney(value, revenueCurrency)} />
                                        <Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} fill="url(#revenueFill)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : empty('No revenue recorded yet')}
                        </SectionCard>
                    </Col>
                    <Col xs={24} xl={8}>
                        <SectionCard title="Plan mix" description="Customer distribution by current plan">
                            {plans.length ? (
                                <ResponsiveContainer className="central-chart" width="100%" height={CHART_HEIGHT}>
                                    <BarChart data={plans} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
                                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" width={92} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [Number(value).toLocaleString(), 'Customers']} />
                                        <Bar dataKey="tenants" fill="#2563eb" radius={[0, 7, 7, 0]} barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : empty('No plan data yet')}
                        </SectionCard>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} xl={12}>
                        <SectionCard title="Customer status" description="Current customer lifecycle counts">
                            {customerStatus.some((item) => item.customers > 0) ? (
                                <ResponsiveContainer className="central-chart" width="100%" height={CHART_HEIGHT}>
                                    <BarChart data={customerStatus} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                                        <XAxis dataKey="status" axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [Number(value).toLocaleString(), 'Customers']} />
                                        <Bar dataKey="customers" fill="#0f766e" radius={[7, 7, 0, 0]} barSize={34} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : empty('No customer status data yet')}
                        </SectionCard>
                    </Col>
                    <Col xs={24} xl={12}>
                        <SectionCard title="Provisioning funnel" description="Current customer lifecycle distribution">
                            {provisioningFunnel.length ? (
                                <div className="central-scroll-list">
                                    {provisioningFunnel.map((item) => (
                                        <div className="central-health-row" key={item.status}>
                                            <span className="central-health-row__name">{humanize(item.status)}</span>
                                            <Typography.Text strong>{item.count}</Typography.Text>
                                        </div>
                                    ))}
                                </div>
                            ) : empty('No provisioning data yet')}
                        </SectionCard>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12} xl={8}>
                        <SectionCard title="Recent payments" description="Latest collected and attempted transactions">
                            {recentPayments.length ? (
                                <div className="central-scroll-list">
                                    {recentPayments.map((payment) => (
                                        <div className="central-attention" key={payment.id}>
                                            <span className="central-attention__copy">
                                                <Typography.Text strong>{payment.tenant?.company_name || payment.tenant_id}</Typography.Text>
                                                <Typography.Text>
                                                    {formatMoney(payment.amount, payment.currency)} · {payment.invoice?.invoice_number || 'No invoice'}
                                                </Typography.Text>
                                                <Typography.Text type="secondary">{formatDate(payment.paid_at, true)}</Typography.Text>
                                            </span>
                                            <StatusBadge value={payment.status} />
                                        </div>
                                    ))}
                                </div>
                            ) : empty('No payments yet')}
                        </SectionCard>
                    </Col>
                    <Col xs={24} lg={12} xl={8}>
                        <SectionCard title="Urgent support" description="Open urgent tickets requiring attention">
                            {urgentTickets.length ? (
                                <div className="central-scroll-list">
                                    {urgentTickets.map((ticket) => (
                                        <div className="central-attention" key={ticket.id}>
                                            <span className="central-attention__copy">
                                                <Typography.Text strong>{ticket.ticket_number} · {ticket.subject}</Typography.Text>
                                                <Typography.Text type="secondary">{ticket.tenant?.company_name || ticket.requester_email}</Typography.Text>
                                            </span>
                                            <Button
                                                type="text"
                                                icon={<ArrowRightOutlined />}
                                                aria-label="Open ticket"
                                                onClick={() => router.visit(route('central.support.tickets.show', ticket.id))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : empty('No urgent tickets')}
                        </SectionCard>
                    </Col>
                    <Col xs={24} lg={24} xl={8}>
                        <SectionCard title="Recent activity" description="Latest administrative changes">
                            {activity.length ? (
                                <div className="central-scroll-list">
                                    {activity.map((item) => (
                                        <div className="central-attention" key={item.id}>
                                            <span className="central-attention__icon central-tone--blue"><AlertOutlined /></span>
                                            <span className="central-attention__copy">
                                                <Typography.Text strong>{humanize(item.action)}</Typography.Text>
                                                <Typography.Text type="secondary">{formatDate(item.created_at, true)}</Typography.Text>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : empty('No administrative activity yet')}
                        </SectionCard>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} xl={12}>
                        <SectionCard title="Needs attention" description="Exceptions that may affect customers">
                            {attention.length ? attention.map((item) => (
                                <div className="central-attention" key={item.key}>
                                    <span className="central-attention__icon"><WarningOutlined /></span>
                                    <span className="central-attention__copy">
                                        <Typography.Text strong>{item.label}</Typography.Text>
                                        <Typography.Text type="secondary">
                                            {item.count ? `${item.count} item${item.count === 1 ? '' : 's'} require review` : 'Nothing outstanding'}
                                        </Typography.Text>
                                    </span>
                                    <Button type="text" icon={<ArrowRightOutlined />} aria-label={item.label} onClick={() => router.visit(item.route)} />
                                </div>
                            )) : empty('Nothing needs attention')}
                        </SectionCard>
                    </Col>
                    <Col xs={24} xl={12}>
                        <SectionCard
                            title="Platform health"
                            description="Live operational summary"
                            extra={<StatusBadge value={health.some((item) => item.status === 'warning') ? 'warning' : 'healthy'} />}
                        >
                            {health.length ? health.map((item) => (
                                <div className="central-health-row" key={item.name}>
                                    <span className="central-health-row__name">
                                        <i className={`central-health-row__dot${item.status === 'warning' ? ' central-health-row__dot--warning' : ''}`} />
                                        {item.name}
                                    </span>
                                    <Typography.Text type="secondary">{item.detail}</Typography.Text>
                                </div>
                            )) : empty('No health data yet')}
                        </SectionCard>
                    </Col>
                </Row>

                <SectionCard
                    title="Recently created customers"
                    description="Newest workspaces and their provisioning state"
                    extra={<Button type="link" onClick={() => router.visit(route('central.tenants.index'))}>View all <ArrowRightOutlined /></Button>}
                >
                    <Table
                        className="central-table"
                        rowKey="id"
                        pagination={false}
                        dataSource={recentTenants}
                        columns={columns}
                        scroll={{ x: 720 }}
                        locale={{ emptyText: empty('No customers created yet') }}
                        onRow={(tenant) => ({ onDoubleClick: () => router.visit(route('central.tenants.show', tenant.id)) })}
                    />
                </SectionCard>
            </div>
        </CentralLayout>
    );
}
