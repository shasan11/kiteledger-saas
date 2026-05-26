import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import AiUsageStats from '@/Components/AI/AiUsageStats';
import { Head } from '@inertiajs/react';
import { RobotOutlined } from '@ant-design/icons';
import {
    Card,
    DatePicker,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS = {
    success: 'success',
    error:   'error',
    blocked: 'warning',
};

const COLUMNS = [
    {
        title: 'Date',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 140,
        render: (v) => v ? dayjs(v).format('DD MMM YY HH:mm') : '—',
    },
    {
        title: 'Module',
        dataIndex: 'module',
        key: 'module',
        width: 150,
        render: (v) => v ? <Tag>{v}</Tag> : '—',
    },
    {
        title: 'Provider',
        dataIndex: 'provider',
        key: 'provider',
        width: 110,
    },
    {
        title: 'Model',
        dataIndex: 'model',
        key: 'model',
        width: 130,
        render: (v) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
    },
    {
        title: 'Tokens',
        dataIndex: 'total_tokens',
        key: 'total_tokens',
        width: 80,
        align: 'right',
        render: (v) => (v ?? 0).toLocaleString(),
    },
    {
        title: 'Duration',
        dataIndex: 'duration_ms',
        key: 'duration_ms',
        width: 90,
        align: 'right',
        render: (v) => v ? `${v}ms` : '—',
    },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (v) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
        title: 'Error',
        dataIndex: 'error_message',
        key: 'error_message',
        ellipsis: true,
        render: (v) => v ? <span style={{ color: 'red', fontSize: 11 }}>{v}</span> : null,
    },
];

export default function Logs() {
    const { token } = theme.useToken();

    const [loading, setLoading] = useState(false);
    const [logs, setLogs]       = useState([]);
    const [stats, setStats]     = useState({});
    const [meta, setMeta]       = useState({});
    const [filters, setFilters] = useState({ page: 1, per_page: 20 });

    const load = useCallback(() => {
        setLoading(true);

        const params = { ...filters };

        axios
            .get('/api/ai/usage-logs', { params })
            .then(({ data }) => {
                setLogs(data.data ?? []);
                setStats(data.stats ?? {});
                setMeta(data.meta ?? {});
            })
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    return (
        <AuthenticatedLayout
            header={
                <Space>
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                    <Title level={5} style={{ margin: 0 }}>AI Usage Logs</Title>
                </Space>
            }
        >
            <Head title="AI Usage Logs" />

            <div style={{ padding: '16px 24px' }}>
                <AiUsageStats stats={stats} />

                <Card
                    size="small"
                    style={{ marginTop: 16 }}
                    title="Request Log"
                    extra={
                        <Space>
                            <Select
                                placeholder="Status"
                                allowClear
                                size="small"
                                style={{ width: 110 }}
                                onChange={(v) => setFilters((f) => ({ ...f, status: v, page: 1 }))}
                                options={[
                                    { value: 'success', label: 'Success' },
                                    { value: 'error',   label: 'Error' },
                                    { value: 'blocked', label: 'Blocked' },
                                ]}
                            />
                            <RangePicker
                                size="small"
                                onChange={(dates) => {
                                    setFilters((f) => ({
                                        ...f,
                                        date_from: dates?.[0]?.format('YYYY-MM-DD'),
                                        date_to:   dates?.[1]?.format('YYYY-MM-DD'),
                                        page: 1,
                                    }));
                                }}
                            />
                        </Space>
                    }
                >
                    <Table
                        dataSource={logs}
                        columns={COLUMNS}
                        rowKey="id"
                        loading={loading}
                        size="small"
                        scroll={{ x: 800 }}
                        pagination={{
                            total:    meta.total,
                            pageSize: meta.per_page ?? 20,
                            current:  meta.current_page ?? 1,
                            showSizeChanger: false,
                            onChange: (page) => setFilters((f) => ({ ...f, page })),
                        }}
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
