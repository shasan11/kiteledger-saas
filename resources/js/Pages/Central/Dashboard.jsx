import CentralLayout from '@/Layouts/CentralLayout';
import MetricCard from '@/Components/Central/MetricCard';
import SectionCard from '@/Components/Central/SectionCard';
import StatusBadge from '@/Components/Central/StatusBadge';
import TenantIdentity from '@/Components/Central/TenantIdentity';
import { formatDate, formatMoney, humanize } from '@/Components/Central/formatters';
import { router, usePage } from '@inertiajs/react';
import {
    AlertOutlined, ArrowRightOutlined, BankOutlined, CreditCardOutlined, DollarOutlined,
    PlusOutlined, RiseOutlined, TeamOutlined, WarningOutlined,
} from '@ant-design/icons';
import { Button, Col, Empty, Row, Space, Table, Typography } from 'antd';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Dashboard({ metrics = {}, recentTenants = [], recentPayments = [], urgentTickets = [], provisioningFunnel = [], planDistribution = [], revenueTrend = [], attention = [], health = [], activity = [] }) {
    const user = usePage().props?.auth?.user;
    const firstName = (user?.name || 'Administrator').split(' ')[0];
    const plans = planDistribution.map((item) => ({ name: item.plan?.name || 'No plan', tenants: Number(item.total) }));
    const columns = [
        { title: 'Tenant', render: (_, tenant) => <TenantIdentity tenant={tenant} /> },
        { title: 'Plan', render: (_, tenant) => tenant.plan?.name || 'No plan' },
        { title: 'Status', render: (_, tenant) => <StatusBadge value={tenant.status} /> },
        { title: 'Created', render: (_, tenant) => formatDate(tenant.created_at) },
        { title: '', render: (_, tenant) => <Button type="text" icon={<ArrowRightOutlined />} aria-label="Open tenant" onClick={() => router.visit(route('central.tenants.show', tenant.id))} /> },
    ];

    return <CentralLayout title="Command center">
        <section className="central-hero">
            <div className="central-hero__content">
                <div><Typography.Title level={2}>Good to see you, {firstName}.</Typography.Title><Typography.Paragraph type="secondary">Here is the operating picture across tenants, revenue, billing, and infrastructure.</Typography.Paragraph></div>
                <div className="central-hero__actions"><Button onClick={() => router.visit(route('central.provisioning-logs.index'))}>View operations</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => router.visit(route('central.tenants.create'))}>Create tenant</Button></div>
            </div>
        </section>

        <Row gutter={[14,14]}>
            <Col xs={24} sm={12} xl={6}><MetricCard label="Monthly recurring revenue" value={formatMoney(metrics.mrr, 'USD', true)} helper={`${formatMoney(metrics.arr, 'USD', true)} ARR`} icon={<DollarOutlined />} /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard label="Active tenants" value={Number(metrics.activeTenants || 0).toLocaleString()} helper={`${metrics.totalTenants || 0} total tenants`} icon={<TeamOutlined />} tone="blue" /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard label="New signups" value={Number(metrics.newSignups || 0).toLocaleString()} trend={metrics.signupGrowth} helper="vs previous month" icon={<RiseOutlined />} tone="violet" /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard label="Outstanding balance" value={formatMoney(metrics.outstandingBalance, 'USD', true)} helper={`${metrics.failedPayments || 0} failed payments`} icon={<CreditCardOutlined />} tone={metrics.failedPayments ? 'rose' : 'amber'} /></Col>
        </Row>

        <Row gutter={[12,12]} style={{ marginTop: 14 }}>
            {[['Trials',metrics.trialTenants,'trialing'],['Suspended',metrics.suspendedTenants,'warning'],['Expired',metrics.expiredTenants,'critical'],['Failed payments',metrics.failedPayments,'critical'],['Outstanding invoices',metrics.outstandingInvoices,'warning'],['New signups',metrics.newSignups,'success'],['Open tickets',metrics.openSupportTickets,'info'],['SLA breached',metrics.slaBreachedTickets,'critical']].map(([label,value,status])=><Col xs={12} md={6} xl={3} key={label}><SectionCard><Typography.Text type="secondary">{label}</Typography.Text><Typography.Title level={3} style={{ margin:'4px 0 0' }}>{Number(value||0).toLocaleString()}</Typography.Title><StatusBadge value={status}/></SectionCard></Col>)}
        </Row>

        <Row gutter={[16,16]} style={{ marginTop: 16 }}>
            <Col xs={24} xl={15}><SectionCard title="Revenue momentum" description="Successful payments over the last 12 months" extra={<Typography.Text strong>{formatMoney(metrics.totalRevenue, 'USD', true)} lifetime</Typography.Text>}>
                <ResponsiveContainer width="100%" height={290}><AreaChart data={revenueTrend} margin={{ top:10,right:5,left:-15,bottom:0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={.25}/><stop offset="95%" stopColor="#0f766e" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip formatter={(value) => formatMoney(value)}/><Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} fill="url(#revenueFill)"/></AreaChart></ResponsiveContainer>
            </SectionCard></Col>
            <Col xs={24} xl={9}><SectionCard title="Plan mix" description="Tenant distribution by current plan">
                {plans.length ? <ResponsiveContainer width="100%" height={290}><BarChart data={plans} layout="vertical" margin={{ top:10,right:15,left:10,bottom:0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb"/><XAxis type="number" axisLine={false} tickLine={false}/><YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="tenants" fill="#2563eb" radius={[0,7,7,0]} barSize={18}/></BarChart></ResponsiveContainer> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No plan data yet" />}
            </SectionCard></Col>
        </Row>

        <Row gutter={[16,16]} style={{ marginTop: 16 }}>
            <Col xs={24} xl={8}><SectionCard title="Recent payments" description="Latest collected and attempted transactions">{recentPayments.length ? recentPayments.map((payment)=><div className="central-attention" key={payment.id}><span className="central-attention__copy"><Typography.Text strong>{payment.tenant?.company_name || payment.tenant_id}</Typography.Text><Typography.Text>{formatMoney(payment.amount,payment.currency)} · {payment.invoice?.invoice_number || 'No invoice'}</Typography.Text><Typography.Text type="secondary">{formatDate(payment.paid_at,true)}</Typography.Text></span><StatusBadge value={payment.status}/></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No payments yet"/>}</SectionCard></Col>
            <Col xs={24} xl={8}><SectionCard title="Urgent support" description="Open urgent tickets requiring attention">{urgentTickets.length ? urgentTickets.map((ticket)=><div className="central-attention" key={ticket.id}><span className="central-attention__copy"><Typography.Text strong>{ticket.ticket_number} · {ticket.subject}</Typography.Text><Typography.Text type="secondary">{ticket.tenant?.company_name || ticket.requester_email}</Typography.Text></span><Button type="text" icon={<ArrowRightOutlined/>} onClick={()=>router.visit(route('central.support.tickets.show',ticket.id))}/></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No urgent tickets"/>}</SectionCard></Col>
            <Col xs={24} xl={8}><SectionCard title="Provisioning funnel" description="Current tenant lifecycle distribution">{provisioningFunnel.map((item)=><div className="central-health-row" key={item.status}><span className="central-health-row__name">{humanize(item.status)}</span><Typography.Text strong>{item.count}</Typography.Text></div>)}</SectionCard></Col>
        </Row>

        <Row gutter={[16,16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12} xl={8}><SectionCard title="Needs attention" description="Exceptions that may affect customers">
                {attention.map((item) => <div className="central-attention" key={item.key}><span className="central-attention__icon"><WarningOutlined /></span><span className="central-attention__copy"><Typography.Text strong>{item.label}</Typography.Text><Typography.Text type="secondary">{item.count ? `${item.count} item${item.count === 1 ? '' : 's'} require review` : 'Nothing outstanding'}</Typography.Text></span><Button type="text" icon={<ArrowRightOutlined />} onClick={() => router.visit(item.route)} /></div>)}
            </SectionCard></Col>
            <Col xs={24} lg={12} xl={8}><SectionCard title="Platform health" description="Live operational summary" extra={<StatusBadge value={health.some((item) => item.status === 'warning') ? 'warning' : 'healthy'} />}>
                {health.map((item) => <div className="central-health-row" key={item.name}><span className="central-health-row__name"><i className={`central-health-row__dot${item.status === 'warning' ? ' central-health-row__dot--warning' : ''}`} />{item.name}</span><Typography.Text type="secondary">{item.detail}</Typography.Text></div>)}
            </SectionCard></Col>
            <Col xs={24} xl={8}><SectionCard title="Recent activity" description="Latest administrative changes">
                {activity.length ? activity.map((item) => <div className="central-attention" key={item.id}><span className="central-attention__icon central-tone--blue"><AlertOutlined /></span><span className="central-attention__copy"><Typography.Text strong>{humanize(item.action)}</Typography.Text><Typography.Text type="secondary">{formatDate(item.created_at, true)}</Typography.Text></span></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No administrative activity yet" />}
            </SectionCard></Col>
        </Row>

        <SectionCard title="Recently created tenants" description="Newest workspaces and their provisioning state" extra={<Button type="link" onClick={() => router.visit(route('central.tenants.index'))}>View all <ArrowRightOutlined /></Button>} style={{ marginTop: 16 }}>
            <Table className="central-table" rowKey="id" pagination={false} dataSource={recentTenants} columns={columns} scroll={{ x: 720 }} onRow={(tenant) => ({ onDoubleClick: () => router.visit(route('central.tenants.show', tenant.id)) })} />
        </SectionCard>
    </CentralLayout>;
}
