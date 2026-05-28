import { Card, Typography, theme } from 'antd';

const { Text } = Typography;

const DEFAULT_PROMPTS = [
    { title: 'Create an invoice',          prompt: 'Create invoice for ABC Traders for 5 laptops at 50000 with 13% VAT' },
    { title: 'Explain accounting impact',  prompt: 'Explain the accounting impact of this invoice' },
    { title: 'Review approval risk',       prompt: 'Review the risk of this transaction before approval' },
    { title: 'Analyze this month',         prompt: 'Why did expenses increase this month?' },
    { title: 'Find overdue customers',     prompt: 'Find customers with overdue invoices' },
    { title: 'Draft payment reminder',     prompt: 'Draft a payment reminder for overdue customers' },
];

export default function KiteAiSuggestionCards({ onPick, prompts = DEFAULT_PROMPTS }) {
    const { token } = theme.useToken();

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '8px 12px 12px',
            }}
        >
            {prompts.map((p) => (
                <Card
                    key={p.title}
                    size="small"
                    hoverable
                    onClick={() => onPick?.(p.prompt)}
                    styles={{ body: { padding: 10 } }}
                    style={{
                        background: token.colorBgContainer,
                        borderColor: token.colorBorderSecondary,
                        cursor: 'pointer',
                    }}
                >
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                        {p.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                        {p.prompt}
                    </Text>
                </Card>
            ))}
        </div>
    );
}
