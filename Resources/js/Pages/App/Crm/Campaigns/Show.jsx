import { useCallback, useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    App, Button, Card, Col, Descriptions, Empty, Row, Skeleton, Space, Statistic, Table, Tabs, Tag, Typography, theme,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title, Paragraph } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatMoney = (v) => v != null ? Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const formatDate = (v) => { if (!v) return '-'; try { return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return v; } };
const labelize = (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

const statusColor = { draft: 'default', active: 'success', paused: 'warning', completed: 'blue', cancelled: 'error' };
const dealStatusColor = { open: 'blue', won: 'green', lost: 'red', cancelled: 'default' };

function RelatedList({ endpoint, params, columns, emptyText, onRowClick }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios.get(api(endpoint), { params: { ...params, page_size: 50 }, headers: authHeaders() })
            .then((res) => {
                if (mounted) {
                    const d = res.data;
                    setRows(Array.isArray(d?.data) ? d.data : Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
                }
            })
            .catch(() => { if (mounted) setRows([]); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [endpoint, JSON.stringify(params)]);

    return (
        <Table
            size="small"
            loading={loading}
            dataSource={rows}
            rowKey={(r, i) => r.id || i}
            columns={columns}
            pagination={{ pageSize: 15, hideOnSinglePage: true }}
            scroll={{ x: 600 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText || 'No records'} /> }}
            onRow={(record) => ({
                onClick: () => onRowClick?.(record),
                style: { cursor: onRowClick ? 'pointer' : 'default' },
            })}
        />
    );
}

export default function CampaignShow({ auth }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const { props } = usePage();
    const campaignId = props.id;

    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/crm-campaigns/${campaignId}`), { headers: authHeaders() });
            setCampaign(res.data?.data || res.data);
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to load campaign');
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Loading...</Title>}>
                <Head title="Campaign" />
                <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
            </AuthenticatedLayout>
        );
    }

    if (!campaign) {
        return (
            <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>Not Found</Title>}>
                <Head title="Campaign Not Found" />
                <Empty description="Campaign not found" />
            </AuthenticatedLayout>
        );
    }

    const stats = campaign.stats || {};

    const headerNode = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
                <Button icon={<ArrowLeftOutlined />} size="small" onClick={() => router.visit('/crm/campaigns')} />
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{campaign.code || '-'}</Text>
                    <Title level={5} style={{ margin: 0 }}>{campaign.name}</Title>
                </div>
            </Space>
            <Space wrap>
                <Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag>
                {campaign.source && <Tag>{campaign.source}</Tag>}
                {campaign.medium && <Tag>{campaign.medium}</Tag>}
            </Space>
        </div>
    );

    const overviewTab = (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
                {[
                    { title: 'Budget', value: campaign.budget, prefix: 'Rs.' },
                    { title: 'Actual Cost', value: stats.actual_cost, prefix: 'Rs.' },
                    { title: 'Revenue', value: stats.revenue, prefix: 'Rs.', color: token.colorSuccess },
                    { title: 'ROI', value: stats.roi, suffix: '%', color: stats.roi > 0 ? token.colorSuccess : stats.roi < 0 ? token.colorError : undefined },
                    { title: 'Leads', value: stats.leads_count },
                    { title: 'Won Deals', value: stats.won_deals_count, color: token.colorSuccess },
                    { title: 'Conversion', value: stats.conversion_rate, suffix: '%' },
                    { title: 'Cost/Lead', value: stats.cost_per_lead, prefix: 'Rs.' },
                ].map((s, i) => (
                    <Col xs={12} sm={8} md={6} key={i}>
                        <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '8px 12px' } }}>
                            <Statistic
                                title={s.title}
                                value={s.value ?? 0}
                                prefix={s.prefix}
                                suffix={s.suffix}
                                precision={s.prefix ? 0 : undefined}
                                valueStyle={{ fontSize: 16, color: s.color }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card size="small" title="Details" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Name">{campaign.name}</Descriptions.Item>
                    <Descriptions.Item label="Code">{campaign.code || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status"><Tag color={statusColor[campaign.status]}>{labelize(campaign.status)}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Source">{campaign.source || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Medium">{campaign.medium || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Budget">{formatMoney(campaign.budget)}</Descriptions.Item>
                    <Descriptions.Item label="Start Date">{formatDate(campaign.start_date)}</Descriptions.Item>
                    <Descriptions.Item label="End Date">{formatDate(campaign.end_date)}</Descriptions.Item>
                    <Descriptions.Item label="Branch">{campaign.branch?.name || '-'}</Descriptions.Item>
                </Descriptions>
            </Card>
        </Space>
    );

    const leadColumns = [
        { title: 'Lead', dataIndex: 'name', key: 'name', render: (v, r) => <><Text strong>{v}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.company_name || ''}</Text></> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={v === 'converted' ? 'purple' : v === 'lost' ? 'red' : 'blue'}>{labelize(v)}</Tag> },
        { title: 'Value', dataIndex: 'expected_value', key: 'value', width: 120, align: 'right', render: formatMoney },
    ];

    const dealColumns = [
        { title: 'Deal', dataIndex: 'title', key: 'title', render: (v) => <Text strong>{v}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={dealStatusColor[v] || 'default'}>{labelize(v)}</Tag> },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: formatMoney },
    ];

    const billColumns = [
        { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no', render: (v) => <Text strong>{v || '-'}</Text> },
        { title: 'Date', dataIndex: 'bill_date', key: 'date', width: 130, render: formatDate },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right', render: formatMoney },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag>{labelize(v)}</Tag> },
    ];

    const ticketColumns = [
        { title: 'Ticket', dataIndex: 'ticket_no', key: 'ticket_no', render: (v, r) => <><Text strong>{v}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.subject}</Text></> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (v) => <Tag>{labelize(v)}</Tag> },
        { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100, render: (v) => <Tag>{labelize(v)}</Tag> },
    ];

    const tabItems = [
        { key: 'overview', label: 'Overview', children: overviewTab },
        {
            key: 'leads', label: `Leads (${stats.leads_count || 0})`,
            children: (
                <RelatedList
                    endpoint="/api/leads/"
                    params={{ campaign_id: campaignId }}
                    columns={leadColumns}
                    emptyText="No leads linked"
                    onRowClick={(r) => router.visit(`/crm/leads/${r.id}`)}
                />
            ),
        },
        {
            key: 'deals', label: `Deals (${stats.deals_count || 0})`,
            children: (
                <RelatedList
                    endpoint="/api/deals/"
                    params={{ campaign_id: campaignId }}
                    columns={dealColumns}
                    emptyText="No deals linked"
                    onRowClick={(r) => router.visit(`/crm/deals/${r.id}`)}
                />
            ),
        },
        {
            key: 'costs', label: 'Costs',
            children: (
                <RelatedList
                    endpoint="/api/purchase-bills/"
                    params={{ campaign_id: campaignId }}
                    columns={billColumns}
                    emptyText="No purchase bills linked"
                    onRowClick={(r) => router.visit(`/payment-out/purchase-bills/${r.id}`)}
                />
            ),
        },
        {
            key: 'support_tickets', label: 'Support Tickets',
            children: (
                <RelatedList
                    endpoint="/api/support-tickets/"
                    params={{ campaign_id: campaignId }}
                    columns={ticketColumns}
                    emptyText="No tickets linked"
                    onRowClick={(r) => router.visit(`/crm/tickets/${r.id}`)}
                />
            ),
        },
    ];

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title={`${campaign.name} - Campaign`} />
            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Tabs items={tabItems} size="small" />
            </div>
        </AuthenticatedLayout>
    );
}
