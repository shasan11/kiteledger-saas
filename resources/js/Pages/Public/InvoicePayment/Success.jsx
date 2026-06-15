import { useEffect, useState } from 'react';
import { Button, Card, Result, Spin, Typography, theme } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const MAX_VERIFY_ATTEMPTS = 6;
const VERIFY_DELAY_MS = 3000;

export default function InvoicePaymentSuccess({ token: publicToken }) {
    const { token } = theme.useToken();
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState(
        'Please wait while we verify your payment. This may take a few seconds.'
    );

    const params = new URLSearchParams(window.location.search);
    const onlinePaymentId = params.get('online_payment_id');
    const provider = params.get('provider');
    const sessionId = params.get('session_id');
    const orderId = params.get('token');

    useEffect(() => {
        let cancelled = false;
        let retryTimer;

        const verify = async (attempt = 1) => {
            if (!onlinePaymentId || !provider) {
                setStatus('error');
                setMessage(
                    'The payment return information is incomplete. Please reopen the invoice and check its payment status.'
                );
                return;
            }

            try {
                const response = await axios.post(
                    `/api/public/invoices/${publicToken}/verify-payment`,
                    {
                        online_payment_id: onlinePaymentId,
                        provider,
                        session_id: sessionId,
                        order_id: orderId,
                        token: orderId,
                    }
                );

                if (cancelled) return;

                if (response.data.status === 'succeeded') {
                    setStatus('succeeded');
                    return;
                }

                if (attempt < MAX_VERIFY_ATTEMPTS) {
                    retryTimer = window.setTimeout(
                        () => verify(attempt + 1),
                        VERIFY_DELAY_MS
                    );
                    return;
                }

                setStatus('error');
                setMessage(
                    response.data.message ||
                        'The payment has not been confirmed yet. Please check the invoice again shortly.'
                );
            } catch (error) {
                if (cancelled) return;

                setStatus('error');
                setMessage(
                    error.response?.data?.message ||
                        'We could not verify the payment. Please check the invoice before trying again.'
                );
            }
        };

        verify();

        return () => {
            cancelled = true;
            if (retryTimer) {
                window.clearTimeout(retryTimer);
            }
        };
    }, [onlinePaymentId, orderId, provider, publicToken, sessionId]);

    const invoiceButton = (
        <Button
            key="invoice"
            type={status === 'error' ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={() => {
                window.location.href = `/pay/invoice/${publicToken}`;
            }}
        >
            View Invoice
        </Button>
    );

    return (
        <div
            style={{
                minHeight: '100vh',
                background: token.colorBgLayout,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
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
                        <Text type="secondary">{message}</Text>
                    </>
                ) : status === 'succeeded' ? (
                    <Result
                        status="success"
                        icon={
                            <CheckCircleOutlined
                                style={{ color: token.colorSuccess }}
                            />
                        }
                        title="Payment Received!"
                        subTitle="Thank you. Your payment was verified and the invoice has been updated."
                        extra={[invoiceButton]}
                    />
                ) : (
                    <Result
                        status="error"
                        icon={
                            <CloseCircleOutlined
                                style={{ color: token.colorError }}
                            />
                        }
                        title="Payment Not Confirmed"
                        subTitle={message}
                        extra={[invoiceButton]}
                    />
                )}
            </Card>
        </div>
    );
}
