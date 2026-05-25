import { Button, Card, Result, Typography } from 'antd';
import { CloseCircleOutlined, RedoOutlined } from '@ant-design/icons';
import { theme } from 'antd';

const { Text } = Typography;

export default function InvoicePaymentFailed({ token: publicToken, reason }) {
    const { token } = theme.useToken();

    const isCancelled = reason === 'cancelled';

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
                <Result
                    status={isCancelled ? 'warning' : 'error'}
                    icon={<CloseCircleOutlined style={{ color: isCancelled ? token.colorWarning : token.colorError }} />}
                    title={isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
                    subTitle={
                        isCancelled
                            ? 'You cancelled the payment. Your invoice has not been paid.'
                            : 'Your payment could not be processed. Please try again or use a different payment method.'
                    }
                    extra={[
                        <Button
                            key="retry"
                            type="primary"
                            icon={<RedoOutlined />}
                            onClick={() => window.location.href = `/pay/invoice/${publicToken}`}
                        >
                            Try Again
                        </Button>,
                    ]}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    If you continue to experience issues, please contact our support team.
                </Text>
            </Card>
        </div>
    );
}
