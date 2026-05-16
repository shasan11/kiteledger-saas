import { useEffect, useMemo, useState } from 'react';
import { App, Button, Descriptions, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { RollbackOutlined } from '@ant-design/icons';
import { api, money, saleStatusColor } from './posHelpers';

const { Text } = Typography;

const refundMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'store_credit', label: 'Store Credit' },
];

export default function PosReturnModal({ open, saleId, sale: initialSale = null, onCancel, onSuccess }) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [sale, setSale] = useState(initialSale);
    const [currentShift, setCurrentShift] = useState(null);
    const [returnLines, setReturnLines] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setFieldsValue({
            refund_method: 'cash',
            reason: '',
            notes: '',
        });
        setReturnLines({});

        if (saleId) {
            void loadSale(saleId);
        } else if (initialSale?.id) {
            setSale(initialSale);
            void loadCurrentShift(initialSale);
        }
    }, [open, saleId, initialSale?.id]);

    async function loadSale(targetSaleId) {
        setLoading(true);
        try {
            const response = await axios.get(api(`/api/pos-sales/${targetSaleId}/refundable`));
            setSale(response.data);
            await loadCurrentShift(response.data);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load refundable sale.');
        } finally {
            setLoading(false);
        }
    }

    async function loadCurrentShift(targetSale) {
        try {
            const response = await axios.get(api('/api/pos-shifts/current'), {
                params: {
                    branch_id: targetSale.branch_id,
                    pos_terminal_id: targetSale.pos_terminal_id,
                },
            });
            setCurrentShift(response.data || null);
        } catch (error) {
            setCurrentShift(null);
            message.error(error?.response?.data?.message || 'Failed to load current POS shift.');
        }
    }

    function availableQty(line) {
        return Math.max(Number(line.qty || 0) - Number(line.returned_qty || 0), 0);
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

    const alreadyRefunded = useMemo(() => {
        return (sale?.pos_returns || [])
            .filter((row) => row.status === 'completed')
            .reduce((sum, row) => sum + Number(row.refund_amount || 0), 0);
    }, [sale]);

    const refundSummary = useMemo(() => {
        return (sale?.pos_sale_lines || []).reduce((summary, line) => ({
            qty: summary.qty + Number(returnLines[line.id]?.qty || 0),
            amount: summary.amount + lineRefundAmount(line),
        }), { qty: 0, amount: 0 });
    }, [sale, returnLines]);

    async function submit(values) {
        if (!sale?.id) {
            message.warning('Select a sale before processing a return.');
            return;
        }

        if (!currentShift?.id) {
            message.error('Open a POS shift on this sale terminal before refunding.');
            return;
        }

        const items = (sale.pos_sale_lines || [])
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

        setSubmitting(true);
        try {
            const draftResponse = await axios.post(api('/api/pos-returns'), {
                pos_sale_id: sale.id,
                pos_shift_id: currentShift.id,
                refund_method: values.refund_method,
                reason: values.reason || null,
                notes: values.notes || null,
                items,
            });

            await axios.post(api(`/api/pos-returns/${draftResponse.data.id}/complete`), {
                approved: true,
                refund_method: values.refund_method,
                reason: values.reason || null,
                notes: values.notes || null,
            });

            message.success('Return processed successfully.');
            onSuccess?.(draftResponse.data);
            handleClose();
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to process return.');
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        form.resetFields();
        setSale(null);
        setCurrentShift(null);
        setReturnLines({});
        onCancel?.();
    }

    const itemColumns = useMemo(() => [
        {
            title: 'Product',
            key: 'product',
            render: (_, line) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{line.product_name}</Text>
                    <Text type="secondary">{line.product?.name || ''}</Text>
                </Space>
            ),
        },
        {
            title: 'Code/SKU/Barcode',
            key: 'code',
            render: (_, line) => line.product_code || line.product?.sku || line.barcode || '-',
        },
        { title: 'Sold Qty', dataIndex: 'qty', key: 'qty', align: 'right' },
        { title: 'Already Returned Qty', dataIndex: 'returned_qty', key: 'returned_qty', align: 'right' },
        { title: 'Available Return Qty', key: 'available', align: 'right', render: (_, line) => money(availableQty(line)) },
        { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Tax', dataIndex: 'tax_amount', key: 'tax_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Line Total', dataIndex: 'line_total', key: 'line_total', align: 'right', render: (value) => `Rs. ${money(value)}` },
        {
            title: 'Refund Qty',
            key: 'refund_qty',
            render: (_, line) => {
                const max = availableQty(line);

                return (
                    <InputNumber
                        min={0}
                        max={max}
                        value={returnLines[line.id]?.qty || 0}
                        disabled={max <= 0}
                        onChange={(value) => updateLine(line.id, { qty: Math.min(Number(value || 0), max) })}
                    />
                );
            },
        },
        { title: 'Refund Amount', key: 'refund_amount', align: 'right', render: (_, line) => `Rs. ${money(lineRefundAmount(line))}` },
        {
            title: 'Remarks',
            key: 'remarks',
            render: (_, line) => (
                <Input
                    value={returnLines[line.id]?.remarks || ''}
                    onChange={(event) => updateLine(line.id, { remarks: event.target.value })}
                    placeholder="Optional"
                />
            ),
        },
    ], [returnLines]);

    return (
        <Modal
            title={`Create Return — ${sale?.sale_no || ''}`}
            open={open}
            onCancel={handleClose}
            width={1180}
            destroyOnClose
            footer={[
                <Button key="cancel" onClick={handleClose}>
                    Cancel
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    danger
                    icon={<RollbackOutlined />}
                    loading={submitting}
                    disabled={loading || !sale || !currentShift || refundSummary.qty <= 0}
                    onClick={() => form.submit()}
                >
                    Process Return
                </Button>,
            ]}
        >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
                {sale ? (
                    <>
                        <Descriptions
                            size="small"
                            bordered
                            column={4}
                            items={[
                                { key: 'sale_no', label: 'Sale No', children: sale.sale_no },
                                { key: 'sale_date', label: 'Sale Date', children: sale.sale_date ? dayjs(sale.sale_date).format('DD-MM-YYYY HH:mm') : '-' },
                                { key: 'customer', label: 'Customer', children: sale.customer_name || sale.contact?.name || 'Walk-in' },
                                { key: 'terminal', label: 'Terminal', children: sale.pos_terminal?.name || '-' },
                                { key: 'branch', label: 'Branch', children: sale.branch?.name || '-' },
                                { key: 'cashier', label: 'Cashier', children: sale.pos_shift?.cashier?.display_name || sale.pos_shift?.cashier?.name || '-' },
                                { key: 'grand_total', label: 'Grand Total', children: `Rs. ${money(sale.grand_total)}` },
                                { key: 'paid_total', label: 'Paid Total', children: `Rs. ${money(sale.paid_total)}` },
                                { key: 'refunded', label: 'Already Refunded', children: `Rs. ${money(alreadyRefunded)}` },
                                { key: 'status', label: 'Current Status', children: <Tag color={saleStatusColor(sale.status)}>{sale.status}</Tag> },
                                { key: 'shift', label: 'Current Shift', children: currentShift?.shift_no || <Tag color="red">No open shift</Tag> },
                            ]}
                        />

                        <Table
                            rowKey="id"
                            size="small"
                            columns={itemColumns}
                            dataSource={sale.pos_sale_lines || []}
                            pagination={false}
                            scroll={{ x: 1180 }}
                        />

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={submit}
                            initialValues={{ refund_method: 'cash' }}
                        >
                            <Space align="start" wrap>
                                <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                                    <Select style={{ width: 180 }} options={refundMethodOptions} />
                                </Form.Item>
                                <Form.Item name="reason" label="Return Reason">
                                    <Input style={{ width: 280 }} placeholder="Customer returned item" />
                                </Form.Item>
                                <Form.Item name="notes" label="Notes">
                                    <Input style={{ width: 320 }} placeholder="Returned from POS Sales screen" />
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
                    <Empty description={loading ? 'Loading sale items...' : 'No sale selected'} />
                )}
            </Space>
        </Modal>
    );
}
