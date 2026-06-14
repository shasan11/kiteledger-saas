import { useState, useEffect, useCallback } from 'react';
import {
    Alert, Button, Card, Col, Divider, Form, Input, InputNumber, Row,
    Select, Skeleton, Space, Spin, Steps, Table, Tag, Typography
} from 'antd';
import {
    CheckCircleOutlined, CreditCardOutlined, FileTextOutlined,
    LockOutlined, SafetyOutlined, WalletOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

const PROVIDER_LABELS = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    razorpay: 'Razorpay',
};

const PROVIDER_COLORS = {
    stripe: '#635BFF',
    paypal: '#003087',
    razorpay: '#3395FF',
};

// Razorpay uses a JS checkout widget; load its script on demand.
const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
        document.body.appendChild(script);
    });

function StatusBadge({ status }) {
    const map = {
        paid: { color: 'success', label: 'Paid' },
        part_paid: { color: 'processing', label: 'Partially Paid' },
        posted: { color: 'default', label: 'Unpaid' },
        draft: { color: 'warning', label: 'Draft' },
    };
    const info = map[status] || { color: 'default', label: status };
    return <Tag color={info.color}>{info.label}</Tag>;
}

function InvoiceSummary({ invoice, company }) {
    const { token } = theme.useToken();
    const columns = [
        { title: 'Description', dataIndex: 'description', key: 'desc' },
        { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'right', width: 70 },
        {
            title: 'Price', dataIndex: 'unit_price', key: 'price', align: 'right', width: 100,
            render: v => `${invoice.currency_symbol}${Number(v).toFixed(2)}`,
        },
        {
            title: 'Total', dataIndex: 'total', key: 'total', align: 'right', width: 100,
            render: v => `${invoice.currency_symbol}${Number(v).toFixed(2)}`,
        },
    ];

    return (
        <Card
            bordered={false}
            style={{ borderRadius: token.borderRadiusLG, height: '100%' }}
        >
            {/* Company header */}
            <Space style={{ marginBottom: 24 }}>
                {company.logo_url && (
                    <img src={company.logo_url} alt={company.name} style={{ height: 48, objectFit: 'contain' }} />
                )}
                <div>
                    <Title level={5} style={{ margin: 0 }}>{company.name}</Title>
                    {company.address && <Text type="secondary">{company.address}</Text>}
                </div>
            </Space>

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                    <Text type="secondary">Invoice</Text>
                    <br />
                    <Text strong>#{invoice.invoice_no}</Text>
                </Col>
                <Col span={12}>
                    <Text type="secondary">Status</Text>
                    <br />
                    <StatusBadge status={invoice.status} />
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                    <Text type="secondary">Invoice Date</Text>
                    <br />
                    <Text>{invoice.invoice_date}</Text>
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                    <Text type="secondary">Due Date</Text>
                    <br />
                    <Text>{invoice.due_date || '—'}</Text>
                </Col>
                <Col span={24} style={{ marginTop: 8 }}>
                    <Text type="secondary">Bill To</Text>
                    <br />
                    <Text strong>{invoice.customer_name}</Text>
                </Col>
            </Row>

            <Table
                dataSource={invoice.lines || []}
                columns={columns}
                pagination={false}
                size="small"
                rowKey={(r, i) => i}
                style={{ marginBottom: 0 }}
            />

            <div style={{
                marginTop: 16, padding: '12px 16px',
                background: token.colorFillTertiary,
                borderRadius: token.borderRadius,
            }}>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                    <Text type="secondary">Subtotal</Text>
                    <Text>{invoice.currency_symbol}{Number(invoice.total).toFixed(2)}</Text>
                </Row>
                {Number(invoice.paid_total) > 0 && (
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                        <Text type="secondary">Paid</Text>
                        <Text style={{ color: '#52c41a' }}>
                            − {invoice.currency_symbol}{Number(invoice.paid_total).toFixed(2)}
                        </Text>
                    </Row>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                    <Text strong>Balance Due</Text>
                    <Title level={4} style={{ margin: 0, color: Number(invoice.balance_due) > 0 ? '#ff4d4f' : '#52c41a' }}>
                        {invoice.currency_symbol}{Number(invoice.balance_due).toFixed(2)}
                    </Title>
                </Row>
            </div>
        </Card>
    );
}

function PaymentPanel({ token: publicToken, invoice, settings, paymentMethods, onSuccess }) {
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [amount, setAmount] = useState(Number(invoice.balance_due));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const balanceDue = Number(invoice.balance_due);

    useEffect(() => {
        setAmount(balanceDue);
    }, [balanceDue]);

    const handlePay = async () => {
        if (!selectedProvider) {
            setError('Please select a payment method.');
            return;
        }
        if (!amount || amount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const res = await axios.post(`/api/public/invoices/${publicToken}/create-payment`, {
                provider: selectedProvider,
                amount,
            });
            const data = res.data;

            if (data.checkout_mode === 'redirect' && data.redirect_url) {
                window.location.href = data.redirect_url;
            } else if (data.checkout_mode === 'razorpay_js') {
                await openRazorpay(data);
            } else if (data.redirect_url) {
                window.location.href = data.redirect_url;
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Payment initiation failed. Please try again.');
            setSubmitting(false);
        }
    };

    const openRazorpay = async (data) => {
        await loadRazorpayScript();
        const gd = data.gateway_data;
        const options = {
            key: gd.key_id,
            amount: gd.amount,
            currency: gd.currency,
            name: gd.name,
            description: gd.description,
            order_id: gd.order_id,
            handler: async (response) => {
                try {
                    await axios.post(`/api/public/invoices/${publicToken}/verify-payment`, {
                        online_payment_id: data.online_payment_id,
                        provider: 'razorpay',
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: gd.amount,
                        currency: gd.currency,
                    });
                    window.location.href = `/pay/invoice/${publicToken}/success?online_payment_id=${data.online_payment_id}`;
                } catch {
                    window.location.href = `/pay/invoice/${publicToken}/failed`;
                }
            },
            modal: { ondismiss: () => setSubmitting(false) },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (paymentMethods.length === 0) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Online payment is currently unavailable."
                description="Please contact the business to arrange payment."
            />
        );
    }

    if (balanceDue <= 0) {
        return (
            <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="This invoice is fully paid."
                description="No payment is required."
            />
        );
    }

    return (
        <Card
            bordered={false}
            style={{ borderRadius: token.borderRadiusLG }}
            title={<Space><WalletOutlined /> Pay Invoice</Space>}
        >
            {error && (
                <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
            )}

            <div style={{ marginBottom: 20 }}>
                <Text type="secondary">Amount Due</Text>
                <br />
                <Title level={2} style={{ margin: 0, color: token.colorError }}>
                    {invoice.currency_symbol}{balanceDue.toFixed(2)}
                </Title>
            </div>

            {/* Payment method selection */}
            <div style={{ marginBottom: 16 }}>
                <Text strong>Select Payment Method</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {paymentMethods.map(pm => (
                        <div
                            key={pm.provider}
                            onClick={() => setSelectedProvider(pm.provider)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: token.borderRadius,
                                border: `2px solid ${selectedProvider === pm.provider ? PROVIDER_COLORS[pm.provider] || token.colorPrimary : token.colorBorderSecondary}`,
                                cursor: 'pointer',
                                background: selectedProvider === pm.provider ? (PROVIDER_COLORS[pm.provider] || token.colorPrimary) + '0F' : token.colorBgContainer,
                                transition: 'all 0.2s',
                            }}
                        >
                            <Space justify="space-between" style={{ width: '100%' }}>
                                <Text strong style={{ color: PROVIDER_COLORS[pm.provider] }}>
                                    {pm.display_name || PROVIDER_LABELS[pm.provider]}
                                </Text>
                                {pm.mode === 'test' && <Tag color="blue">TEST</Tag>}
                            </Space>
                        </div>
                    ))}
                </div>
            </div>

            {/* Amount input (only for partial payments) */}
            {settings.allow_partial_payment && (
                <div style={{ marginBottom: 16 }}>
                    <Text strong>Payment Amount ({invoice.currency_code})</Text>
                    <InputNumber
                        style={{ width: '100%', marginTop: 8 }}
                        min={settings.minimum_partial_amount || 0.01}
                        max={settings.allow_overpayment ? undefined : balanceDue}
                        step={0.01}
                        precision={2}
                        value={amount}
                        onChange={setAmount}
                        prefix={invoice.currency_symbol}
                        size="large"
                    />
                    {settings.minimum_partial_amount && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Minimum: {invoice.currency_symbol}{Number(settings.minimum_partial_amount).toFixed(2)}
                        </Text>
                    )}
                </div>
            )}

            <Button
                type="primary"
                size="large"
                block
                icon={<LockOutlined />}
                loading={submitting}
                onClick={handlePay}
                disabled={!selectedProvider}
                style={{ height: 48, fontSize: 16 }}
            >
                Pay {invoice.currency_symbol}{amount?.toFixed(2)} Securely
            </Button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Space>
                    <SafetyOutlined style={{ color: token.colorSuccess }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Secured by SSL encryption. We never store your card details.
                    </Text>
                </Space>
            </div>

            {settings.enable_google_login && settings.google_client_id && (
                <>
                    <Divider>Optional</Divider>
                    <Button block icon={<span>G</span>} style={{ marginBottom: 8 }}>
                        Continue with Google
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
                        Google login is optional. You can pay without signing in.
                    </Text>
                </>
            )}
        </Card>
    );
}

export default function InvoicePaymentShow({ token: publicToken }) {
    const { token } = theme.useToken();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(`/api/public/invoices/${publicToken}`);
                setData(res.data);
            } catch (e) {
                setError(e.response?.data?.message || 'Invoice not found or payment link is invalid.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [publicToken]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: token.colorBgLayout, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: token.colorBgLayout, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
                    <Alert type="error" showIcon message={error} />
                    <br />
                    <Text type="secondary">This link may have expired or been disabled.</Text>
                </Card>
            </div>
        );
    }

    const { company, invoice, settings, payment_methods: paymentMethods } = data;

    return (
        <div style={{ minHeight: '100vh', background: token.colorBgLayout, padding: '32px 16px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={14}>
                        <InvoiceSummary invoice={invoice} company={company} />
                    </Col>
                    <Col xs={24} lg={10}>
                        <PaymentPanel
                            token={publicToken}
                            invoice={invoice}
                            settings={settings}
                            paymentMethods={paymentMethods}
                        />
                    </Col>
                </Row>
            </div>
        </div>
    );
}
