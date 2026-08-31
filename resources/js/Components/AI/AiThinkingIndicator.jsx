import { Space, Typography, theme } from 'antd';

const { Text } = Typography;

export default function AiThinkingIndicator({ isMobile = false, label = 'Working on your request' }) {
    const { token } = theme.useToken();

    return (
        <div
            className="kl-rise"
            style={{
                display: 'flex',
                justifyContent: 'flex-start',
                padding: isMobile ? '6px 0' : '8px 0',
            }}
            role="status"
            aria-live="polite"
        >
            <div
                style={{
                    padding: '10px 14px',
                    borderRadius: `${token.borderRadiusXL}px ${token.borderRadiusXL}px ${token.borderRadiusXL}px 4px`,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    boxShadow: token.boxShadowTertiary,
                }}
            >
                <Space size={10}>
                    <span aria-hidden="true">
                        <span className="kl-dot" />
                        <span className="kl-dot" style={{ marginLeft: 4 }} />
                        <span className="kl-dot" style={{ marginLeft: 4 }} />
                    </span>

                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {label}
                    </Text>
                </Space>
            </div>
        </div>
    );
}
