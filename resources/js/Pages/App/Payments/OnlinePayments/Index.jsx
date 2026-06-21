import { useState, useEffect } from 'react';
import {
    Badge, Button, Card, Col, Input, Row, Select, Space, Table, Tag, Typography
} from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    pending: 'default',
    processing: 'processing',
    succeeded: 'success',
    failed: 'error',
    cancelled: 'warning',
    refunded: 'default',
    partially_refunded: 'warning',
};

const PROVIDER_LABELS = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    razorpay: 'Razorpay',
};

export default function OnlinePaymentsIndex() {
    const { token } = theme.useToken();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [filters, setFilters] = useState({ status: undefined, provider: undefined, q: '' });

    const load = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.pageSize,
                ...(filters.status && { status: filters.status }),
                ...(filters.provider && { provider: filters.provider }),
                ...(filters.q && { q: filters.q }),
            };
            const res = await axios.get('/api/online-payments', { params });
            const d = res.data;
            setPayments(d.data || []);
            setPagination(prev => ({ ...prev, current: page, total: d.total || 0 }));
        } catch {
            //
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(1); }, [filters]);

    const columns = [
        {
            title: 'Date',
            dataIndex: 'paid_at',
            key: 'paid_at',
            width: 120,
            render: v => v ? new Date(v).toLocaleDateString() : '—',
        },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
            width: 100,
            render: v => PROVIDER_LABELS[v] || v,
        },
        {
            title: 'Invoice',
            dataIndex: 'invoice',
            key: 'invoice',
            render: v => v?.invoice_no || '—',
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer',
            render: (v, record) => v || record.contact?.name || '—',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (v, record) => `${record.currency_code} ${Number(v).toFixed(2)}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: v => <Tag color={STATUS_COLORS[v] || 'default'}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>,
        },
        {
            title: 'Reference',
            dataIndex: 'provider_payment_id',
            key: 'ref',
            render: v => v ? <Text code style={{ fontSize: 11 }}>{v.substring(0, 20)}...</Text> : '—',
        },
        {
            title: '',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => router.visit(`/payments/online/${record.id}`)}
                >
                    View
                </Button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout header="Online Payments">
            <div style={{ padding: '24px 16px' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Online Payments</Title>
                        <Text type="secondary">View all online payment transactions</Text>
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current)}>Refresh</Button>
                    </Col>
                </Row>

                <Card bordered={false} style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={10}>
                            <Input
                                prefix={<SearchOutlined />}
                                placeholder="Search by customer, reference..."
                                value={filters.q}
                                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                                allowClear
                            />
                        </Col>
                        <Col xs={12} sm={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Filter by provider"
                                allowClear
                                value={filters.provider}
                                onChange={v => setFilters(f => ({ ...f, provider: v }))}
                                options={Object.entries(PROVIDER_LABELS).map(([k, label]) => ({ value: k, label }))}
                            />
                        </Col>
                        <Col xs={12} sm={7}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Filter by status"
                                allowClear
                                value={filters.status}
                                onChange={v => setFilters(f => ({ ...f, status: v }))}
                                options={Object.keys(STATUS_COLORS).map(s => ({
                                    value: s,
                                    label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                }))}
                            />
                        </Col>
                    </Row>
                </Card>

                <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }}>
                    <Table
                        dataSource={payments}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: pagination.current,
                            total: pagination.total,
                            pageSize: pagination.pageSize,
                            onChange: load,
                            showSizeChanger: false,
                        }}
                        scroll={{ x: 800 }}
                        size="small"
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
