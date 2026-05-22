import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Empty,
    Input,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import {
    AppstoreOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TicketKanban from './components/TicketKanban';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const STATUS_OPTIONS = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Waiting Customer', value: 'waiting_customer' },
    { label: 'Waiting Internal', value: 'waiting_internal' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
];

const PRIORITY_OPTIONS = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
];

const statusColor = {
    open: 'blue',
    in_progress: 'processing',
    waiting_customer: 'gold',
    waiting_internal: 'orange',
    resolved: 'success',
    closed: 'default',
};

const priorityColor = {
    low: 'default',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

const labelize = (v) =>
    v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-';

const formatDate = (v) => {
    if (!v) return '-';
    try {
        return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return v; }
};

const formatDateTime = (v) => {
    if (!v) return '-';
    try {
        return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return v; }
};

export default function TicketIndex() {
    const { message } = App.useApp();
    const { token } = theme.useToken();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [priorityFilter, setPriorityFilter] = useState(undefined);
    const [summary, setSummary] = useState({});
    const [view, setView] = useState('table');

    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;

            const [listRes, summaryRes] = await Promise.all([
                axios.get(api('/api/support-tickets'), { params }),
                axios.get(api('/api/support-tickets/summary')),
            ]);

            const data = listRes.data;
            setTickets(data?.data || data?.results || []);
            setTotal(data?.count || data?.total || 0);
            setSummary(summaryRes.data || {});
        } catch (err) {
            message.error(err?.response?.data?.message || 'Failed to load tickets');
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter, priorityFilter]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    const columns = useMemo(() => [
        {
            title: 'Ticket',
            dataIndex: 'ticket_no',
            key: 'ticket_no',
            width: 130,
            render: (v) => <Text strong>{v}</Text>,
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            ellipsis: true,
        },
        {
            title: 'Contact',
            dataIndex: 'contact',
            key: 'contact',
            width: 160,
            render: (_, r) => r?.contact?.name || '-',
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (v) => <Tag color={priorityColor[v] || 'default'}>{labelize(v)}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (v) => <Tag color={statusColor[v] || 'default'}>{labelize(v)}</Tag>,
        },
        {
            title: 'Assigned To',
            key: 'assigned_to',
            width: 140,
            render: (_, r) => r?.assigned_to?.name || r?.assigned_to?.display_name || '-',
        },
        {
            title: 'Due Date',
            dataIndex: 'due_at',
            key: 'due_at',
            width: 130,
            render: (v, r) => {
                const isOverdue = v && new Date(v) < new Date() && !['resolved', 'closed'].includes(r?.status);
                return <Text type={isOverdue ? 'danger' : undefined}>{formatDate(v)}</Text>;
            },
        },
        {
            title: 'Last Activity',
            dataIndex: 'last_activity_at',
            key: 'last_activity_at',
            width: 160,
            render: formatDateTime,
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 130,
            render: formatDate,
        },
    ], []);

    const summaryCards = [
        { label: 'Open', value: summary?.open_count, color: token.colorInfo },
        { label: 'In Progress', value: summary?.in_progress_count, color: token.colorPrimary },
        { label: 'Waiting', value: summary?.waiting_count, color: token.colorWarning },
        { label: 'Urgent', value: summary?.urgent_count, color: token.colorError },
        { label: 'Overdue', value: summary?.overdue_count, color: token.colorError },
        { label: 'Resolved (Month)', value: summary?.resolved_this_month, color: token.colorSuccess },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>Support Tickets</Typography.Title>
                    <Space>
                        <Space.Compact size="small">
                            <Button
                                icon={<UnorderedListOutlined />}
                                type={view === 'table' ? 'primary' : 'default'}
                                onClick={() => setView('table')}
                            />
                            <Button
                                icon={<AppstoreOutlined />}
                                type={view === 'kanban' ? 'primary' : 'default'}
                                onClick={() => setView('kanban')}
                            />
                        </Space.Compact>
                        <Button icon={<ReloadOutlined />} onClick={loadTickets} loading={loading} size="small" />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => router.visit('/support/tickets?action=create')}
                        >
                            New Ticket
                        </Button>
                    </Space>
                </div>
            }
        >
            <Head title="Support Tickets" />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Row gutter={[8, 8]}>
                        {summaryCards.map((card) => (
                            <Col xs={12} sm={8} md={4} key={card.label}>
                                <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
                                    <Statistic
                                        title={<Text type="secondary" style={{ fontSize: 12 }}>{card.label}</Text>}
                                        value={card.value ?? 0}
                                        valueStyle={{ fontSize: 20, fontWeight: 600, color: card.color }}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {view === 'table' ? (
                        <>
                            <Card
                                size="small"
                                bordered={false}
                                style={{ border: `1px solid ${token.colorBorderSecondary}` }}
                                bodyStyle={{ padding: '8px 12px' }}
                            >
                                <Row gutter={[8, 8]} align="middle">
                                    <Col xs={24} sm={8} md={6}>
                                        <Input
                                            allowClear
                                            prefix={<SearchOutlined />}
                                            placeholder="Search tickets..."
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                            size="small"
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} md={4}>
                                        <Select
                                            allowClear
                                            placeholder="Status"
                                            options={STATUS_OPTIONS}
                                            value={statusFilter}
                                            onChange={(v) => { setStatusFilter(v); setPage(1); }}
                                            style={{ width: '100%' }}
                                            size="small"
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} md={4}>
                                        <Select
                                            allowClear
                                            placeholder="Priority"
                                            options={PRIORITY_OPTIONS}
                                            value={priorityFilter}
                                            onChange={(v) => { setPriorityFilter(v); setPage(1); }}
                                            style={{ width: '100%' }}
                                            size="small"
                                        />
                                    </Col>
                                </Row>
                            </Card>

                            <Card
                                size="small"
                                bordered={false}
                                style={{ border: `1px solid ${token.colorBorderSecondary}` }}
                                bodyStyle={{ padding: 0 }}
                            >
                                <Table
                                    rowKey="id"
                                    size="small"
                                    loading={loading}
                                    dataSource={tickets}
                                    columns={columns}
                                    scroll={{ x: 1200 }}
                                    pagination={{
                                        current: page,
                                        pageSize,
                                        total,
                                        showSizeChanger: true,
                                        showTotal: (t) => `${t} tickets`,
                                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                                    }}
                                    onRow={(record) => ({
                                        onClick: () => router.visit(`/support/tickets/${record.id}`),
                                        style: { cursor: 'pointer' },
                                    })}
                                    locale={{
                                        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tickets found" />,
                                    }}
                                />
                            </Card>
                        </>
                    ) : (
                        <TicketKanban onRefresh={loadTickets} />
                    )}
                </Space>
            </div>
        </AuthenticatedLayout>
    );
}
