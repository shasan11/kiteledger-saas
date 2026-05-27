import { useEffect, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    List,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, RollbackOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import PosLayout from '@/Layouts/PosLayout.jsx';
import PrintablePdfEmailWrapper from '@/Components/PrintableComponent';
import { api, money, saleStatusColor, showApiError } from './Shared/posHelpers';
import PosReturnModal from './Shared/PosReturnModal';

const { Text, Title } = Typography;

export default function PosSaleShow({ id }) {
    const { message } = App.useApp();
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const can = (permission) => permissions.includes(permission);
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [printOpen, setPrintOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    useEffect(() => {
        void loadRecord();
    }, [id]);

    async function loadRecord() {
        setLoading(true);
        try {
            const response = await axios.get(api(`/api/pos-sales/${id}`));
            setRecord(response.data);
        } catch (error) {
            showApiError(message, error, 'Failed to load POS sale.');
        } finally {
            setLoading(false);
        }
    }

    function openReturn() {
        if (!record?.pos_sale_lines?.length) {
            message.warning('No sale lines available for return.');
            return;
        }

        setReturnOpen(true);
    }

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

    const canReturn = can('pos.return.create') && ['completed', 'part_refunded'].includes(record?.status);

    return (
        <PosLayout>
            <Head title={record?.sale_no || 'POS Sale'} />

            <div style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <Space>
                        <Link href={route('pos.sales.index')}>
                            <Button icon={<ArrowLeftOutlined />}>Back to Sales</Button>
                        </Link>
                        <Text strong style={{ fontSize: 15 }}>POS Sale</Text>
                    </Space>
                    <Space>
                        {canReturn && (
                            <Button icon={<RollbackOutlined />} onClick={openReturn} disabled={loading || !record}>
                                Return
                            </Button>
                        )}
                        <Button icon={<PrinterOutlined />} onClick={() => setPrintOpen(true)}>Print Preview</Button>
                    </Space>
                </div>
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

            <PosReturnModal
                open={returnOpen}
                saleId={record?.id}
                sale={record}
                onCancel={() => setReturnOpen(false)}
                onSuccess={async () => {
                    setReturnOpen(false);
                    await loadRecord();
                }}
            />

            <Drawer open={printOpen} onClose={() => setPrintOpen(false)} title="Receipt Preview" width={480}>
                {record ? (
                    <PrintablePdfEmailWrapper
                        title="POS Receipt"
                        subTitle={record.sale_no}
                        fileName={`pos-receipt-${record.sale_no || record.id}.pdf`}
                        pageSize="80mm"
                        allowDownload={false}
                        allowEmail={false}
                    >
                        <div style={{ width: '80mm', padding: '4mm', fontFamily: 'Arial, sans-serif', fontSize: 12 }}>
                            <div style={{ textAlign: 'center', fontWeight: 700 }}>{record.branch?.name || 'POS Receipt'}</div>
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>{record.sale_no}</div>
                            <div>Date: {dayjs(record.sale_date).format('DD-MM-YYYY HH:mm')}</div>
                            <div>Customer: {record.customer_name || record.contact?.name || 'Walk-in'}</div>
                            <hr />
                            {(record.pos_sale_lines || []).map((line) => (
                                <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>{line.product_name} x {Number(line.qty || 0)}</span>
                                    <strong>Rs. {money(line.line_total)}</strong>
                                </div>
                            ))}
                            <hr />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Total</strong><strong>Rs. {money(record.grand_total)}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Paid</span><span>Rs. {money(record.paid_total)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Due/Change</span><span>Rs. {money(Number(record.balance_due || 0) || record.change_amount)}</span></div>
                        </div>
                    </PrintablePdfEmailWrapper>
                ) : null}
            </Drawer>
        </PosLayout>
    );
}
