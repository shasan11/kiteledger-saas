import { useEffect, useState } from 'react';
import { Button, Card, Result, Spin, Steps, Typography } from 'antd';
import { CheckCircleOutlined, FileTextOutlined, HomeOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import axios from 'axios';

const { Text, Title } = Typography;

export default function InvoicePaymentSuccess({ token: publicToken }) {
    const { token } = theme.useToken();
    const [status, setStatus] = useState('processing'); // processing | succeeded | error
    const [details, setDetails] = useState(null);
    const [polls, setPolls] = useState(0);

    // Get query params
    const params = new URLSearchParams(window.location.search);
    const onlinePaymentId = params.get('online_payment_id');
    const sessionId = params.get('session_id'); // Stripe
    const orderId = params.get('token'); // PayPal

    useEffect(() => {
        // If we have a session/order from redirect, try verifying immediately
        const verifyFromRedirect = async () => {
            if (!onlinePaymentId) {
                // No online_payment_id — show generic success, webhook will confirm
                setStatus('succeeded');
                return;
            }

            try {
                const res = await axios.post(`/api/public/invoices/${publicToken}/verify-payment`, {
                    online_payment_id: onlinePaymentId,
                    provider: params.get('provider') || 'stripe',
                    session_id: sessionId,
                    order_id: orderId,
                    token: orderId,
                });

                if (res.data.status === 'succeeded') {
                    setStatus('succeeded');
                } else {
                    // Poll a few times waiting for webhook
                    setStatus('processing');
                    pollForConfirmation();
                }
            } catch {
                setStatus('succeeded'); // Optimistic — webhook will confirm
            }
        };

        verifyFromRedirect();
    }, []);

    const pollForConfirmation = () => {
        if (polls >= 5) {
            setStatus('succeeded'); // Give up polling, webhook will confirm
            return;
        }

        setTimeout(async () => {
            try {
                const res = await axios.post(`/api/public/invoices/${publicToken}/verify-payment`, {
                    online_payment_id: onlinePaymentId,
                    provider: params.get('provider') || 'stripe',
                    session_id: sessionId,
                });

                if (res.data.status === 'succeeded') {
                    setStatus('succeeded');
                } else {
                    setPolls(p => p + 1);
                    pollForConfirmation();
                }
            } catch {
                setStatus('succeeded');
            }
        }, 3000);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: token.colorBgLayout,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <Card
                style={{
                    maxWidth: 480,
                    width: '100%',
                    borderRadius: token.borderRadiusLG,
                    textAlign: 'center',
                }}
                bordered={false}
            >
                {status === 'processing' ? (
                    <>
                        <Spin size="large" style={{ marginBottom: 16 }} />
                        <Title level={4}>Confirming your payment...</Title>
                        <Text type="secondary">
                            Please wait while we verify your payment. This may take a few seconds.
                        </Text>
                    </>
                ) : (
                    <Result
                        status="success"
                        icon={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
                        title="Payment Received!"
                        subTitle="Thank you. Your payment has been received and your invoice will be updated shortly."
                        extra={[
                            <Button
                                key="invoice"
                                icon={<FileTextOutlined />}
                                onClick={() => window.location.href = `/pay/invoice/${publicToken}`}
                            >
                                View Invoice
                            </Button>,
                        ]}
                    />
                )}
            </Card>
        </div>
    );
}
