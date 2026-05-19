import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { App, Button, Card, Descriptions, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, fetchList, money, saleStatusColor, showApiError } from './Shared/posHelpers';

const { Text, Title } = Typography;

const refundMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'store_credit', label: 'Store Credit' },
];

export default function PosReturnsPage() {
    const { message } = App.useApp();
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const can = (permission) => permissions.includes(permission);
    const [rows, setRows] = useState([]);
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [currentShift, setCurrentShift] = useState(null);
    const [returnLines, setReturnLines] = useState({});
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        void bootstrap();
    }, []);

    async function bootstrap() {
        try {
            const [returnPayload, salesPayload] = await Promise.all([
                fetchList('/api/pos-returns', { page_size: 100 }),
                fetchList('/api/pos-sales', { page_size: 100, refundable: true }),
            ]);
            setRows(returnPayload.results || []);
            setSales(salesPayload.results || []);
        } catch {
            showApiError(message, error, 'Failed to load POS returns.');
        }
    }

    async function selectSale(saleId) {
        setLoading(true);
        try {
            const saleResponse = await axios.get(api(`/api/pos-sales/${saleId}/refundable`));
            const sale = saleResponse.data;
            setSelectedSale(sale);
            setReturnLines({});

            const shiftResponse = await axios.get(api('/api/pos-shifts/current'), {
                params: {
                    branch_id: sale.branch_id,
                    pos_terminal_id: sale.pos_terminal_id,
                },
            });
            setCurrentShift(shiftResponse.data || null);
        } catch (error) {
            showApiError(message, error, 'Failed to load refundable sale.');
        } finally {
            setLoading(false);
        }
    }

    function updateLine(lineId, patch) {
        setReturnLines((current) => ({
            ...current,
            [lineId]: {
                ...(current[lineId] || {}),
                ...patch,
            },
        }));
    }

    function lineRefundAmount(line) {
        const qty = Number(returnLines[line.id]?.qty || 0);
        const soldQty = Number(line.qty || 0);
        const perUnit = soldQty > 0 ? Number(line.line_total || 0) / soldQty : 0;

        return Math.round(qty * perUnit * 100) / 100;
    }

    const refundSummary = useMemo(() => {
        const lines = selectedSale?.pos_sale_lines || [];
        return lines.reduce((summary, line) => ({
            qty: summary.qty + Number(returnLines[line.id]?.qty || 0),
            amount: summary.amount + lineRefundAmount(line),
        }), { qty: 0, amount: 0 });
    }, [selectedSale, returnLines]);

    async function submit(values) {
        if (!selectedSale?.id) {
            message.warning('Select a completed sale first.');
            return;
        }

        if (!currentShift?.id) {
            message.error('Open shift on the original sale terminal before refunding.');
            return;
        }

        const items = (selectedSale.pos_sale_lines || [])
            .map((line) => ({
                pos_sale_line_id: line.id,
                qty: Number(returnLines[line.id]?.qty || 0),
                remarks: returnLines[line.id]?.remarks || null,
            }))
            .filter((line) => line.qty > 0);

        if (items.length < 1) {
            message.warning('Enter a refund quantity for at least one item.');
            return;
        }

        setLoading(true);
        try {
            const draftResponse = await axios.post(api('/api/pos-returns'), {
                pos_sale_id: selectedSale.id,
                pos_shift_id: currentShift.id,
                refund_method: values.refund_method,
                reason: values.reason,
                notes: values.notes,
                items,
            });
            await axios.post(api(`/api/pos-returns/${draftResponse.data.id}/complete`), {
                approved: true,
                refund_method: values.refund_method,
                reason: values.reason,
                notes: values.notes,
            });
            setOpen(false);
            setSelectedSale(null);
            setCurrentShift(null);
            setReturnLines({});
            form.resetFields();
            await bootstrap();
            message.success('Return completed.');
        } catch (error) {
            showApiError(message, error, 'Failed to create return.');
        } finally {
            setLoading(false);
        }
    }

    const returnColumns = useMemo(() => [
        { title: 'Return No', dataIndex: 'return_no', key: 'return_no' },
        { title: 'Date', dataIndex: 'return_date', key: 'return_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Sale', key: 'sale', render: (_, record) => record.pos_sale?.sale_no || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={saleStatusColor(value)}>{value}</Tag> },
        { title: 'Refund Amount', dataIndex: 'refund_amount', key: 'refund_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Method', dataIndex: 'refund_method', key: 'refund_method' },
    ], []);

    const saleColumns = useMemo(() => [
        { title: 'Sale No', dataIndex: 'sale_no', key: 'sale_no', render: (value) => <Text strong>{value}</Text> },
        { title: 'Date', dataIndex: 'sale_date', key: 'sale_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Customer', key: 'customer', render: (_, record) => record.customer_name || record.contact?.name || 'Walk-in' },
        { title: 'Terminal', key: 'terminal', render: (_, record) => record.pos_terminal?.name || '-' },
        { title: 'Total', dataIndex: 'grand_total', key: 'grand_total', align: 'right', render: (value) => `Rs. ${money(value)}` },
    ], []);

    const itemColumns = useMemo(() => [
        { title: 'Product', key: 'product', render: (_, line) => (
            <Space direction="vertical" size={0}>
                <Text strong>{line.product_name}</Text>
                <Text type="secondary">{line.product_code || line.barcode || line.product?.sku || '-'}</Text>
            </Space>
        ) },
        { title: 'Sold', dataIndex: 'qty', key: 'qty', align: 'right' },
        { title: 'Returned', dataIndex: 'returned_qty', key: 'returned_qty', align: 'right' },
        { title: 'Available', key: 'available', align: 'right', render: (_, line) => money(Number(line.qty || 0) - Number(line.returned_qty || 0)) },
        { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Tax', dataIndex: 'tax_amount', key: 'tax_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Line Total', dataIndex: 'line_total', key: 'line_total', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Refund Qty', key: 'refund_qty', render: (_, line) => {
            const available = Math.max(Number(line.qty || 0) - Number(line.returned_qty || 0), 0);
            return (
                <InputNumber
                    min={0}
                    max={available}
                    value={returnLines[line.id]?.qty || 0}
                    onChange={(value) => updateLine(line.id, { qty: Math.min(Number(value || 0), available) })}
                />
            );
        } },
        { title: 'Refund Amount', key: 'refund_amount', align: 'right', render: (_, line) => `Rs. ${money(lineRefundAmount(line))}` },
        { title: 'Remarks', key: 'remarks', render: (_, line) => (
            <Input
                value={returnLines[line.id]?.remarks || ''}
                onChange={(event) => updateLine(line.id, { remarks: event.target.value })}
            />
        ) },
    ], [returnLines]);

    return (
        <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>POS Returns</Title>}>
            <Head title="POS Returns" />
            <div style={{ padding: 16 }}>
                <Card bordered={false}>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Create refunds from completed sales and track returned quantities.</Text>
                            <Button type="primary" disabled={!can('pos.return.create')} onClick={() => setOpen(true)}>Create Return</Button>
                        </div>
                        <Table rowKey="id" columns={returnColumns} dataSource={rows} />
                    </Space>
                </Card>
            </div>

            <Modal
                title="Create POS Return"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
                width={1100}
                confirmLoading={loading}
            >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Table
                        rowKey="id"
                        size="small"
                        columns={saleColumns}
                        dataSource={sales}
                        pagination={{ pageSize: 5 }}
                        rowSelection={{
                            type: 'radio',
                            selectedRowKeys: selectedSale?.id ? [selectedSale.id] : [],
                            onChange: ([saleId]) => selectSale(saleId),
                        }}
                    />

                    {selectedSale ? (
                        <>
                            <Descriptions
                                size="small"
                                column={3}
                                bordered
                                items={[
                                    { key: 'sale_no', label: 'Sale No', children: selectedSale.sale_no },
                                    { key: 'date', label: 'Sale Date', children: dayjs(selectedSale.sale_date).format('DD-MM-YYYY HH:mm') },
                                    { key: 'customer', label: 'Customer', children: selectedSale.customer_name || selectedSale.contact?.name || 'Walk-in' },
                                    { key: 'terminal', label: 'Terminal', children: selectedSale.pos_terminal?.name || '-' },
                                    { key: 'branch', label: 'Branch', children: selectedSale.branch?.name || '-' },
                                    { key: 'cashier', label: 'Cashier', children: selectedSale.pos_shift?.cashier?.display_name || selectedSale.pos_shift?.cashier?.name || '-' },
                                    { key: 'total', label: 'Grand Total', children: `Rs. ${money(selectedSale.grand_total)}` },
                                    { key: 'refunded', label: 'Already Refunded', children: `Rs. ${money((selectedSale.pos_returns || []).filter((row) => row.status === 'completed').reduce((sum, row) => sum + Number(row.refund_amount || 0), 0))}` },
                                    { key: 'shift', label: 'Refund Shift', children: currentShift?.shift_no || <Tag color="red">No open shift</Tag> },
                                ]}
                            />

                            <Table
                                rowKey="id"
                                size="small"
                                columns={itemColumns}
                                dataSource={selectedSale.pos_sale_lines || []}
                                pagination={false}
                                scroll={{ x: 1000 }}
                            />

                            <Form form={form} layout="vertical" onFinish={submit} initialValues={{ refund_method: 'cash' }}>
                                <Space align="start" style={{ width: '100%' }}>
                                    <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                                        <Select style={{ width: 180 }} options={refundMethods} />
                                    </Form.Item>
                                    <Form.Item name="reason" label="Reason">
                                        <Input style={{ width: 260 }} placeholder="Customer returned item" />
                                    </Form.Item>
                                    <Form.Item name="notes" label="Notes">
                                        <Input style={{ width: 260 }} />
                                    </Form.Item>
                                    <Descriptions
                                        size="small"
                                        column={1}
                                        items={[
                                            { key: 'qty', label: 'Refund Qty', children: money(refundSummary.qty) },
                                            { key: 'amount', label: 'Refund Amount', children: <Text strong>Rs. {money(refundSummary.amount)}</Text> },
                                        ]}
                                    />
                                </Space>
                            </Form>
                        </>
                    ) : (
                        <Empty description="Select a completed sale to view refundable items" />
                    )}
                </Space>
            </Modal>
        </AuthenticatedLayout>
    );
}
