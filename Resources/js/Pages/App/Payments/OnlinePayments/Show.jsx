import { useState, useEffect } from 'react';
import {
    Alert, Badge, Button, Card, Col, Descriptions, Divider, message,
    Modal, Row, Space, Table, Tag, Typography
} from 'antd';
import {
    ArrowLeftOutlined, ReloadOutlined, RollbackOutlined, WarningOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { exchangeRateLabel, useBaseCurrency } from '@/Components/Transactions/defaultCurrency.js';

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS = {
    pending: 'default',
    processing: 'processing',
    succeeded: 'success',
    failed: 'error',
    cancelled: 'warning',
    refunded: 'default',
    partially_refunded: 'warning',
};

export default function OnlinePaymentShow({ id }) {
    const { token } = theme.useToken();
    const baseCurrency = useBaseCurrency(true);
    const [payment, setPayment] = useState(null);
    const [webhookLogs, setWebhookLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refundModal, setRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refunding, setRefunding] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [paymentRes, logsRes] = await Promise.all([
                axios.get(`/api/online-payments/${id}`),
                axios.get(`/api/online-payments/${id}/webhook-logs`),
            ]);
            setPayment(paymentRes.data);
            setWebhookLogs(logsRes.data.data || []);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const handleRefund = async () => {
        if (!refundAmount || parseFloat(refundAmount) <= 0) {
            message.error('Please enter a valid refund amount.');
            return;
        }
        setRefunding(true);
        try {
            const res = await axios.post(`/api/online-payments/${id}/refund`, { amount: parseFloat(refundAmount) });
            if (res.data.success) {
                message.success('Refund initiated successfully.');
                setRefundModal(false);
                load();
            } else {
                message.error(res.data.message || 'Refund failed.');
            }
        } catch (e) {
            message.error(e.response?.data?.message || 'Refund failed.');
        } finally {
            setRefunding(false);
        }
    };

    const webhookColumns = [
        { title: 'Time', dataIndex: 'received_at', key: 'time', width: 160, render: v => v ? new Date(v).toLocaleString() : '—' },
        { title: 'Event', dataIndex: 'event_type', key: 'type' },
        {
            title: 'Verified',
            dataIndex: 'verified',
            key: 'verified',
            width: 80,
            render: v => v ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>,
        },
        {
            title: 'Processed',
            dataIndex: 'processed',
            key: 'processed',
            width: 90,
            render: v => v ? <Tag color="success">Yes</Tag> : <Tag color="warning">No</Tag>,
        },
        {
            title: 'Error',
            dataIndex: 'processing_error',
            key: 'error',
            render: v => v ? <Text type="danger" style={{ fontSize: 12 }}>{v}</Text> : '—',
        },
    ];

    if (!payment && !loading) {
        return (
            <AuthenticatedLayout header="Online Payment">
                <Alert type="error" message="Payment not found." />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header="Online Payment Detail">
            <div style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.visit('/payments/online')}
                        >
                            Back
                        </Button>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
                            {payment?.status === 'succeeded' && (
                                <Button
                                    danger
                                    icon={<RollbackOutlined />}
                                    onClick={() => { setRefundAmount(payment.amount); setRefundModal(true); }}
                                >
                                    Refund
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>

                {payment && (
                    <>
                        <Card bordered={false} style={{ borderRadius: token.borderRadiusLG, marginBottom: 16 }}>
                            <Row gutter={[24, 16]}>
                                <Col span={24}>
                                    <Space align="center">
                                        <Title level={4} style={{ margin: 0 }}>
                                            {payment.currency_code} {Number(payment.amount).toFixed(2)}
                                        </Title>
                                        <Tag color={STATUS_COLORS[payment.status] || 'default'}>
                                            {payment.status?.replace(/_/g, ' ').toUpperCase()}
                                        </Tag>
                                        <Tag>{payment.provider?.toUpperCase()}</Tag>
                                    </Space>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '16px 0' }} />

                            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                                <Descriptions.Item label="Customer">
                                    {payment.customer_name || payment.contact?.name || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Email">
                                    {payment.customer_email || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Invoice">
                                    {payment.invoice?.invoice_no || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Payment Date">
                                    {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Provider Payment ID">
                                    <Text code style={{ fontSize: 12 }}>{payment.provider_payment_id || '—'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Provider Order ID">
                                    <Text code style={{ fontSize: 12 }}>{payment.provider_order_id || '—'}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={exchangeRateLabel(baseCurrency)}>
                                    {payment.exchange_rate || '1'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Gateway Fee">
                                    {payment.currency_code} {Number(payment.gateway_fee || 0).toFixed(2)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Verified At">
                                    {payment.verified_at ? new Date(payment.verified_at).toLocaleString() : '—'}
                                </Descriptions.Item>
                                {payment.customer_payment && (
                                    <Descriptions.Item label="Customer Payment">
                                        <Text>{payment.customer_payment?.payment_no || payment.customer_payment_id}</Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>

                            {payment.failed_reason && (
                                <Alert
                                    type="error"
                                    showIcon
                                    message="Failure Reason"
                                    description={payment.failed_reason}
                                    style={{ marginTop: 16 }}
                                />
                            )}
                        </Card>

                        {/* Webhook Logs */}
                        <Card
                            title="Webhook Events"
                            bordered={false}
                            style={{ borderRadius: token.borderRadiusLG }}
                        >
                            {webhookLogs.length === 0 ? (
                                <Text type="secondary">No webhook events recorded for this payment.</Text>
                            ) : (
                                <Table
                                    dataSource={webhookLogs}
                                    columns={webhookColumns}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                />
                            )}
                        </Card>
                    </>
                )}
            </div>

            <Modal
                title={<Space><WarningOutlined style={{ color: token.colorWarning }} /> Issue Refund</Space>}
                open={refundModal}
                onCancel={() => setRefundModal(false)}
                onOk={handleRefund}
                okText="Issue Refund"
                okButtonProps={{ danger: true, loading: refunding }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="Refunds may take 5-10 business days to appear on the customer's statement."
                    style={{ marginBottom: 16 }}
                />
                <div style={{ marginBottom: 8 }}>
                    <Text>Refund Amount ({payment?.currency_code})</Text>
                </div>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payment?.amount}
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: token.borderRadius,
                        fontSize: 16,
                    }}
                />
            </Modal>
        </AuthenticatedLayout>
    );
}
