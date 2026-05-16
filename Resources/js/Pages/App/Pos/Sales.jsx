import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Button, Card, DatePicker, Row, Col, Select, Space, Table, Tag, Typography, App } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, defaultRangeForKey, fetchList, money, rangeParams, saleStatusColor } from './Shared/posHelpers';
import PosReturnModal from './Shared/PosReturnModal';

const { Text, Title } = Typography;

export default function PosSalesPage() {
    const { message } = App.useApp();
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const can = (permission) => permissions.includes(permission);
    const [loading, setLoading] = useState(true);
    const [rangeKey, setRangeKey] = useState('today');
    const [range, setRange] = useState(defaultRangeForKey('today'));
    const [rows, setRows] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [filters, setFilters] = useState({ status: undefined, pos_terminal_id: undefined, cashier_id: undefined });
    const [returnSaleId, setReturnSaleId] = useState(null);

    useEffect(() => {
        void bootstrap();
    }, []);

    useEffect(() => {
        void loadRows();
    }, [range, filters]);

    async function bootstrap() {
        setLoading(true);
        try {
            const [salesPayload, terminalPayload] = await Promise.all([
                fetchList('/api/pos-sales', { ...rangeParams(range), page_size: 100 }),
                fetchList('/api/pos-terminals', { page_size: 100, active: true }),
            ]);
            setRows(salesPayload.results || []);
            setTerminals(terminalPayload.results || []);
        } catch (error) {
            message.error('Failed to load POS sales.');
        } finally {
            setLoading(false);
        }
    }

    async function loadRows() {
        try {
            const payload = await fetchList('/api/pos-sales', {
                ...rangeParams(range),
                ...filters,
                page_size: 100,
            });
            setRows(payload.results || []);
        } catch (error) {
            message.error('Failed to refresh POS sales.');
        }
    }

    function canReturnSale(record) {
        return can('pos.return.create') && ['completed', 'part_refunded'].includes(record.status);
    }

    const columns = useMemo(() => [
        { title: 'Sale No', dataIndex: 'sale_no', key: 'sale_no', render: (value) => <Text strong>{value}</Text> },
        { title: 'Date', dataIndex: 'sale_date', key: 'sale_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Terminal', key: 'terminal', render: (_, record) => record.pos_terminal?.name || '-' },
        { title: 'Customer', key: 'customer', render: (_, record) => record.customer_name || record.contact?.name || 'Walk-in' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={saleStatusColor(value)}>{value}</Tag> },
        { title: 'Grand Total', dataIndex: 'grand_total', key: 'grand_total', align: 'right', render: (value) => <Text strong>Rs. {money(value)}</Text> },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => router.visit(route('pos.sales.show', record.id))}>View</Button>
                    {canReturnSale(record) && (
                        <Button size="small" danger onClick={() => setReturnSaleId(record.id)}>Return</Button>
                    )}
                </Space>
            ),
        },
    ], [permissions]);

    return (
        <AuthenticatedLayout
            header={<Title level={4} style={{ margin: 0 }}>POS Sales</Title>}
        >
            <Head title="POS Sales" />

            <div style={{ padding: 16 }}>
                <Card bordered={false}>
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                        <Row gutter={12}>
                            <Col xs={24} md={8}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={rangeKey}
                                    onChange={(value) => {
                                        setRangeKey(value);
                                        setRange(defaultRangeForKey(value));
                                    }}
                                    options={[
                                        { value: 'today', label: 'Today' },
                                        { value: 'week', label: 'This Week' },
                                        { value: 'month', label: 'This Month' },
                                        { value: 'custom', label: 'Custom Range' },
                                    ]}
                                />
                            </Col>
                            <Col xs={24} md={8}>
                                <DatePicker.RangePicker style={{ width: '100%' }} value={range} onChange={setRange} disabled={rangeKey !== 'custom'} />
                            </Col>
                            <Col xs={24} md={8}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Select
                                        allowClear
                                        placeholder="Status"
                                        style={{ width: '40%' }}
                                        value={filters.status}
                                        onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                                        options={[
                                            { value: 'completed', label: 'Completed' },
                                            { value: 'held', label: 'Held' },
                                            { value: 'cancelled', label: 'Cancelled' },
                                            { value: 'refunded', label: 'Refunded' },
                                            { value: 'part_refunded', label: 'Part Refunded' },
                                        ]}
                                    />
                                    <Select
                                        allowClear
                                        placeholder="Terminal"
                                        style={{ width: '60%' }}
                                        value={filters.pos_terminal_id}
                                        onChange={(value) => setFilters((current) => ({ ...current, pos_terminal_id: value }))}
                                        options={terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))}
                                    />
                                </Space.Compact>
                            </Col>
                        </Row>

                        <Table
                            loading={loading}
                            rowKey="id"
                            columns={columns}
                            dataSource={rows}
                            onRow={(record) => ({
                                onClick: (event) => {
                                    if (event.target.closest('button')) return;
                                    router.visit(route('pos.sales.show', record.id));
                                },
                                style: { cursor: 'pointer' },
                            })}
                        />
                    </Space>
                </Card>
            </div>

            <PosReturnModal
                open={!!returnSaleId}
                saleId={returnSaleId}
                onCancel={() => setReturnSaleId(null)}
                onSuccess={async () => {
                    setReturnSaleId(null);
                    await loadRows();
                }}
            />
        </AuthenticatedLayout>
    );
}
