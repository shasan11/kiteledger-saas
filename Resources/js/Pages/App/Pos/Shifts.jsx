import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { App, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Row, Col, Select, Space, Table, Tag, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, defaultRangeForKey, fetchList, money, rangeParams } from './Shared/posHelpers';

const { Title, Text } = Typography;

export default function PosShiftsPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [openShift, setOpenShift] = useState(null);
    const [filters, setFilters] = useState({ status: undefined, pos_terminal_id: undefined });
    const [rangeKey, setRangeKey] = useState('today');
    const [range, setRange] = useState(defaultRangeForKey('today'));
    const [openModal, setOpenModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();

    useEffect(() => {
        void bootstrap();
    }, []);

    useEffect(() => {
        void loadRows();
    }, [filters, range]);

    async function bootstrap() {
        setLoading(true);
        try {
            const [shiftPayload, terminalPayload, currentResponse] = await Promise.all([
                fetchList('/api/pos-shifts', { page_size: 100, ...rangeParams(range) }),
                fetchList('/api/pos-terminals', { page_size: 100, active: true }),
                axios.get(api('/api/pos-shifts/current')),
            ]);
            setRows(shiftPayload.results || []);
            setTerminals(terminalPayload.results || []);
            setOpenShift(currentResponse.data || null);
        } catch {
            message.error('Failed to load POS shifts.');
        } finally {
            setLoading(false);
        }
    }

    async function loadRows() {
        try {
            const payload = await fetchList('/api/pos-shifts', {
                page_size: 100,
                ...rangeParams(range),
                ...filters,
            });
            setRows(payload.results || []);
        } catch {
            message.error('Failed to refresh POS shifts.');
        }
    }

    async function submitOpen(values) {
        try {
            await axios.post(api('/api/pos-shifts/open'), values);
            setOpenModal(false);
            form.resetFields();
            await bootstrap();
            message.success('Shift opened.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to open shift.');
        }
    }

    async function closeShift(shift) {
        try {
            await axios.post(api(`/api/pos-shifts/${shift.id}/close`), { counted_cash: shift.expected_cash || 0 });
            await bootstrap();
            message.success('Shift closed.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to close shift.');
        }
    }

    const columns = useMemo(() => [
        { title: 'Shift No', dataIndex: 'shift_no', key: 'shift_no' },
        { title: 'Terminal', key: 'terminal', render: (_, record) => record.pos_terminal?.name || '-' },
        { title: 'Cashier', key: 'cashier', render: (_, record) => record.cashier?.display_name || record.cashier?.name || '-' },
        { title: 'Opened', dataIndex: 'opened_at', key: 'opened_at', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'open' ? 'green' : 'default'}>{value}</Tag> },
        { title: 'Expected Cash', dataIndex: 'expected_cash', key: 'expected_cash', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Sales', dataIndex: 'total_sales', key: 'total_sales', align: 'right', render: (value) => `Rs. ${money(value)}` },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => record.status === 'open' ? <Button size="small" danger onClick={() => closeShift(record)}>Close</Button> : null,
        },
    ], []);

    return (
        <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>POS Shifts</Title>}>
            <Head title="POS Shifts" />

            <div style={{ padding: 16 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {openShift && (
                        <Card bordered={false} title="Current Open Shift">
                            <Descriptions
                                column={3}
                                items={[
                                    { key: 'shift', label: 'Shift', children: openShift.shift_no },
                                    { key: 'terminal', label: 'Terminal', children: openShift.pos_terminal?.name || '-' },
                                    { key: 'cashier', label: 'Cashier', children: openShift.cashier?.display_name || openShift.cashier?.name || '-' },
                                    { key: 'sales', label: 'Sales', children: `Rs. ${money(openShift.total_sales)}` },
                                    { key: 'expected_cash', label: 'Expected Cash', children: `Rs. ${money(openShift.expected_cash)}` },
                                    { key: 'difference', label: 'Cash Difference', children: `Rs. ${money(openShift.cash_difference)}` },
                                ]}
                            />
                        </Card>
                    )}

                    <Card bordered={false}>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Row gutter={12}>
                                <Col xs={24} md={6}>
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
                                <Col xs={24} md={6}>
                                    <Select
                                        allowClear
                                        placeholder="Terminal"
                                        style={{ width: '100%' }}
                                        value={filters.pos_terminal_id}
                                        onChange={(value) => setFilters((current) => ({ ...current, pos_terminal_id: value }))}
                                        options={terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))}
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Button type="primary" block onClick={() => setOpenModal(true)}>Open Shift</Button>
                                </Col>
                            </Row>

                            <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} />
                        </Space>
                    </Card>
                </Space>
            </div>

            <Modal title="Open Shift" open={openModal} onCancel={() => setOpenModal(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={submitOpen}>
                    <Form.Item name="pos_terminal_id" label="Terminal" rules={[{ required: true }]}>
                        <Select options={terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))} />
                    </Form.Item>
                    <Form.Item name="opening_cash" label="Opening Cash">
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
