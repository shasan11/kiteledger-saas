import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Alert,
    App,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Form,
    InputNumber,
    List,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, RollbackOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, money, saleStatusColor } from './Shared/posHelpers';

const { Text, Title } = Typography;

export default function PosSaleShow({ id }) {
    const { message } = App.useApp();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printOpen, setPrintOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnLines, setReturnLines] = useState([]);
    const [refundMethod, setRefundMethod] = useState('cash');
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        let active = true;

        axios.get(api(`/api/pos-sales/${id}`))
            .then((response) => {
                if (active) setRecord(response.data);
            })
            .catch(() => message.error('Failed to load POS sale.'))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id]);

    function openReturn() {
        if (!record?.pos_sale_lines?.length) {
            message.warning('No sale lines available for return.');
            return;
        }
        setReturnLines(
            record.pos_sale_lines.map((line) => ({
                ...line,
                return_qty: 0,
                max_qty: Number(line.qty || 0),
            })),
        );
        setRefundMethod('cash');
        setReturnOpen(true);
    }

    function updateReturnQty(lineId, value) {
        setReturnLines((current) =>
            current.map((line) =>
                line.id === lineId
                    ? { ...line, return_qty: Math.min(value || 0, line.max_qty) }
                    : line,
            ),
        );
    }

    async function submitReturn() {
        const items = returnLines
            .filter((line) => Number(line.return_qty || 0) > 0)
            .map((line) => ({ pos_sale_line_id: line.id, qty: Number(line.return_qty) }));

        if (!items.length) {
            message.warning('Enter at least one return quantity greater than zero.');
            return;
        }

        setReturning(true);
        try {
            const draftResponse = await axios.post(api('/api/pos-returns/'), {
                pos_sale_id: record.id,
                refund_method: refundMethod,
                items,
            });

            await axios.post(api(`/api/pos-returns/${draftResponse.data.id}/complete`), {
                approved: true,
            });

            setReturnOpen(false);

            const refreshed = await axios.get(api(`/api/pos-sales/${id}`));
            setRecord(refreshed.data);

            message.success('Return processed successfully.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to process return.');
        } finally {
            setReturning(false);
        }
    }

    const returnLineColumns = useMemo(
        () => [
            {
                title: 'Product',
                dataIndex: 'product_name',
                key: 'product_name',
                render: (value) => <Text strong>{value}</Text>,
            },
            {
                title: 'Sold Qty',
                dataIndex: 'qty',
                key: 'qty',
                align: 'right',
                width: 90,
            },
            {
                title: 'Unit Price',
                dataIndex: 'unit_price',
                key: 'unit_price',
                align: 'right',
                width: 110,
                render: (value) => `Rs. ${money(value)}`,
            },
            {
                title: 'Return Qty',
                key: 'return_qty',
                align: 'right',
                width: 130,
                render: (_, line) => (
                    <InputNumber
                        size="small"
                        min={0}
                        max={line.max_qty}
                        value={line.return_qty}
                        style={{ width: 90 }}
                        onChange={(value) => updateReturnQty(line.id, value)}
                    />
                ),
            },
        ],
        [returnLines],
    );

    const lineColumns = useMemo(() => [
        { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' },
        { title: 'Price', dataIndex: 'unit_price', key: 'unit_price', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Discount', dataIndex: 'discount_amount', key: 'discount_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Tax', dataIndex: 'tax_amount', key: 'tax_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Line Total', dataIndex: 'line_total', key: 'line_total', align: 'right', render: (value) => <Text strong>Rs. {money(value)}</Text> },
    ], []);

    const paymentColumns = useMemo(() => [
        { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', render: (value) => <Tag>{value}</Tag> },
        { title: 'Reference', dataIndex: 'reference', key: 'reference' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (value) => <Text strong>Rs. {money(value)}</Text> },
    ], []);

    const canReturn = record?.status === 'completed' || record?.status === 'part_refunded';

    return (
        <AuthenticatedLayout
            header={
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                        <Link href={route('pos.sales.index')}>
                            <Button icon={<ArrowLeftOutlined />}>Back to Sales</Button>
                        </Link>
                        <Title level={4} style={{ margin: 0 }}>POS Sale</Title>
                    </Space>
                    <Space>
                        {canReturn && (
                            <Button
                                icon={<RollbackOutlined />}
                                onClick={openReturn}
                                disabled={loading || !record}
                            >
                                Return
                            </Button>
                        )}
                        <Button icon={<PrinterOutlined />} onClick={() => setPrintOpen(true)}>Print Preview</Button>
                    </Space>
                </Space>
            }
        >
            <Head title={record?.sale_no || 'POS Sale'} />

            <div style={{ padding: 16 }}>
                {!loading && !record ? (
                    <Empty description="Sale not found" />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 12 }}>
                        <Card bordered={false}>
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Title level={4} style={{ margin: 0 }}>{record?.sale_no || 'Sale'}</Title>
                                <Tag color={saleStatusColor(record?.status)}>{record?.status}</Tag>
                                <Text type="secondary">{record?.customer_name || record?.contact?.name || 'Walk-in Customer'}</Text>
                                <Descriptions
                                    size="small"
                                    column={1}
                                    items={[
                                        { key: 'terminal', label: 'Terminal', children: record?.pos_terminal?.name || '-' },
                                        { key: 'shift', label: 'Shift', children: record?.pos_shift?.shift_no || '-' },
                                        { key: 'cashier', label: 'Cashier', children: record?.pos_shift?.cashier?.display_name || record?.pos_shift?.cashier?.name || '-' },
                                        { key: 'invoice', label: 'Invoice', children: record?.invoice?.invoice_no || '-' },
                                        { key: 'payment', label: 'Payment', children: record?.customer_payment?.payment_no || '-' },
                                        { key: 'total', label: 'Grand Total', children: `Rs. ${money(record?.grand_total)}` },
                                    ]}
                                />
                            </Space>
                        </Card>

                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Card bordered={false} title="Sale Details">
                                <Descriptions
                                    bordered
                                    size="small"
                                    column={2}
                                    items={[
                                        { key: 'date', label: 'Sale Date', children: record?.sale_date ? dayjs(record.sale_date).format('DD-MM-YYYY HH:mm') : '-' },
                                        { key: 'status', label: 'Status', children: <Tag color={saleStatusColor(record?.status)}>{record?.status}</Tag> },
                                        { key: 'customer_phone', label: 'Customer Phone', children: record?.customer_phone || record?.contact?.phone || '-' },
                                        { key: 'customer_email', label: 'Customer Email', children: record?.customer_email || record?.contact?.email || '-' },
                                        { key: 'subtotal', label: 'Subtotal', children: `Rs. ${money(record?.subtotal)}` },
                                        { key: 'discount_total', label: 'Discount', children: `Rs. ${money(record?.discount_total)}` },
                                        { key: 'tax_total', label: 'Tax', children: `Rs. ${money(record?.tax_total)}` },
                                        { key: 'paid_total', label: 'Paid', children: `Rs. ${money(record?.paid_total)}` },
                                        { key: 'balance_due', label: 'Balance Due', children: `Rs. ${money(record?.balance_due)}` },
                                        { key: 'change_amount', label: 'Change', children: `Rs. ${money(record?.change_amount)}` },
                                    ]}
                                />
                            </Card>

                            <Card bordered={false} title="Sale Lines">
                                <Table rowKey="id" columns={lineColumns} dataSource={record?.pos_sale_lines || []} pagination={false} />
                            </Card>

                            <Card bordered={false} title="Payments">
                                <Table rowKey="id" columns={paymentColumns} dataSource={record?.pos_payments || []} pagination={false} />
                            </Card>
                        </Space>
                    </div>
                )}
            </div>

            {/* Return Drawer */}
            <Drawer
                title={`Process Return — ${record?.sale_no || ''}`}
                open={returnOpen}
                onClose={() => setReturnOpen(false)}
                width={680}
                destroyOnClose
                footer={
                    <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                        <Button onClick={() => setReturnOpen(false)}>Cancel</Button>
                        <Button
                            type="primary"
                            danger
                            icon={<RollbackOutlined />}
                            loading={returning}
                            onClick={submitReturn}
                        >
                            Process Return
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Alert
                        type="info"
                        showIcon
                        message="Set the return quantity for each item. Only items with quantity greater than zero will be returned."
                    />

                    <Table
                        rowKey="id"
                        size="small"
                        columns={returnLineColumns}
                        dataSource={returnLines}
                        pagination={false}
                        summary={() => {
                            const totalReturnAmt = returnLines.reduce((sum, line) => {
                                const base = Number(line.return_qty || 0) * Number(line.unit_price || 0);
                                return sum + base;
                            }, 0);
                            return (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={3}>
                                        <Text strong>Return Total</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="right">
                                        <Text strong>Rs. {money(totalReturnAmt)}</Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            );
                        }}
                    />

                    <Form layout="vertical">
                        <Form.Item label="Refund Method" required>
                            <Select
                                value={refundMethod}
                                onChange={setRefundMethod}
                                options={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'card', label: 'Card' },
                                    { value: 'online', label: 'Online' },
                                    { value: 'wallet', label: 'Wallet' },
                                    { value: 'store_credit', label: 'Store Credit' },
                                ]}
                            />
                        </Form.Item>
                    </Form>
                </Space>
            </Drawer>

            <Drawer open={printOpen} onClose={() => setPrintOpen(false)} title="Receipt Preview" width={480}>
                {record ? (
                    <List
                        header={<Title level={4} style={{ margin: 0 }}>{record.sale_no}</Title>}
                        dataSource={record.pos_sale_lines || []}
                        renderItem={(line) => (
                            <List.Item>
                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Text>{line.product_name}</Text>
                                    <Text strong>Rs. {money(line.line_total)}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                ) : null}
            </Drawer>
        </AuthenticatedLayout>
    );
}
