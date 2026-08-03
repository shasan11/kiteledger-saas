import { Col, Row, Space, Typography, theme } from 'antd';
import {
    BankOutlined,
    BookOutlined,
    FileSearchOutlined,
    LineChartOutlined,
    ShoppingOutlined,
    WalletOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

/*
 * Prompts grouped by intent, not listed flat.
 *
 * A flat list of eight sentences is read as a wall; four labelled groups let
 * someone find the shape of their question first and the wording second.
 * Each group leads with a concrete example rather than a category name alone.
 */
const GROUPS = [
    {
        key: 'financial',
        label: 'Financial position',
        icon: <LineChartOutlined />,
        prompts: [
            'Give me a financial overview for this fiscal year.',
            'How are sales performing this month?',
        ],
    },
    {
        key: 'receivables',
        label: 'Money owed',
        icon: <WalletOutlined />,
        prompts: [
            'Which customers owe us the most?',
            'Which supplier bills are due soon?',
        ],
    },
    {
        key: 'records',
        label: 'Find a record',
        icon: <FileSearchOutlined />,
        prompts: [
            'Find invoice INV-0001.',
            'Show payments received from a customer.',
        ],
    },
    {
        key: 'help',
        label: 'How to use KiteLedger',
        icon: <BookOutlined />,
        prompts: [
            'How do I create and send an invoice?',
            'Which report shows the trial balance?',
        ],
    },
];

/**
 * First-run state for the Copilot.
 *
 * Replaces a generic "no messages" empty state. An empty chat gives the user
 * nothing to act on; showing what the assistant is actually good at is what
 * turns a blank screen into a starting point.
 */
export default function AiWelcome({ onSelect, disabled = false, isMobile = false }) {
    const { token } = theme.useToken();

    return (
        <div className="kl-rise" style={{ padding: isMobile ? '24px 4px' : '40px 8px', maxWidth: 760, margin: '0 auto' }}>
            <Space direction="vertical" size={4} style={{ marginBottom: 28, textAlign: 'center', width: '100%' }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: token.borderRadiusLG,
                        background: token.colorPrimaryBg,
                        border: `1px solid ${token.colorPrimaryBorder}`,
                        color: token.colorPrimary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        margin: '0 auto 12px',
                    }}
                >
                    <BankOutlined />
                </div>

                <Title level={4} style={{ margin: 0 }}>
                    What would you like to know?
                </Title>

                <Text type="secondary" style={{ fontSize: 13 }}>
                    Ask about your figures, find a document, or learn how something works.
                    Answers about live data are calculated from your ledger, not estimated.
                </Text>
            </Space>

            <Row gutter={[12, 12]}>
                {GROUPS.map((group) => (
                    <Col xs={24} sm={12} key={group.key}>
                        <div
                            style={{
                                height: '100%',
                                padding: 14,
                                borderRadius: token.borderRadiusLG,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                background: token.colorBgContainer,
                            }}
                        >
                            <Space size={8} style={{ marginBottom: 10 }}>
                                <span style={{ color: token.colorPrimary }}>{group.icon}</span>
                                <Text strong style={{ fontSize: 13 }}>
                                    {group.label}
                                </Text>
                            </Space>

                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                {group.prompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        className="kl-prompt-card"
                                        disabled={disabled}
                                        onClick={() => onSelect?.(prompt)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            // 44px minimum keeps the target
                                            // comfortable on touch devices.
                                            minHeight: 44,
                                            padding: '9px 11px',
                                            borderRadius: token.borderRadius,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            background: token.colorFillQuaternary,
                                            color: disabled ? token.colorTextDisabled : token.colorText,
                                            font: 'inherit',
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </Space>
                        </div>
                    </Col>
                ))}
            </Row>

            <Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 20 }}
            >
                <ShoppingOutlined style={{ marginRight: 4 }} />
                Copilot prepares drafts for your approval. It never posts or approves anything on its own.
            </Text>
        </div>
    );
}
