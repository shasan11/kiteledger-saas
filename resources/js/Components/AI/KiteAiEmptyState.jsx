import { Typography, theme } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function KiteAiEmptyState() {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '32px 16px',
                color: token.colorTextSecondary,
            }}
        >
            <div
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: token.colorFillSecondary,
                    marginBottom: 12,
                }}
            >
                <ThunderboltOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
            </div>
            <Title level={5} style={{ marginBottom: 4 }}>How can Kite AI help?</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
                Ask Kite AI to create drafts, explain accounting impact, review risk, or analyze reports.
            </Text>
        </div>
    );
}
