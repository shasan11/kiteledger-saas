import { Button, Card, Space, Typography } from 'antd';

const { Text } = Typography;

const QUESTIONS = [
    'What is my profit this month?',
    'Show receivables summary',
    'Show payables summary',
    'Show cash and bank balance',
    'Show expenses this month',
    'Show customer ledger',
    'Show unpaid invoices',
    'Show unpaid purchase bills',
    'Summarize uploaded documents',
];

export default function AiSuggestedQuestions({ disabled, onSelect }) {
    return (
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text strong>Suggested Questions</Text>
                <Space wrap size={[6, 6]}>
                    {QUESTIONS.map((question) => (
                        <Button key={question} size="small" disabled={disabled} onClick={() => onSelect?.(question)}>
                            {question}
                        </Button>
                    ))}
                </Space>
            </Space>
        </Card>
    );
}
