import { Alert, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import AiSummaryCards from './AiSummaryCards';
import AiBusinessTable from './AiBusinessTable';
import AiSourceNote from './AiSourceNote';
import AiWarningBox from './AiWarningBox';
import AiFollowUpActions from './AiFollowUpActions';

const { Title, Paragraph, Text } = Typography;

export default function AiMessageRenderer({ message = {}, onFollowup }) {
    const answer = message.answer;
    const showBody = answer?.body?.trim() && answer.body.trim() !== answer?.headline?.trim();
    const confidenceColor = answer?.confidence === 'high' ? 'success' : answer?.confidence === 'medium' ? 'blue' : 'warning';

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {answer ? (
                <>
                    <Title level={4} style={{ margin: 0, lineHeight: 1.35 }}>
                        {answer.headline}
                    </Title>
                    {showBody && (
                        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.75 }}>
                            {answer.body}
                        </Paragraph>
                    )}
                    {(answer.bullets || []).length > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(127,127,127,.06)' }}>
                            <Text strong>Key points</Text>
                            <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                                {answer.bullets.map((bullet, index) => (
                                    <li key={`${index}-${bullet}`} style={{ marginBottom: 5 }}>{bullet}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {(answer.limitations || []).length > 0 && (
                        <Alert
                            type="info"
                            showIcon
                            icon={<InfoCircleOutlined />}
                            message="What I could not confirm"
                            description={answer.limitations.join(' ')}
                        />
                    )}
                    <Tag color={confidenceColor} icon={<CheckCircleOutlined />} bordered={false} style={{ width: 'fit-content' }}>
                        {answer.confidence_label || 'Needs more context'}
                    </Tag>
                </>
            ) : message.content ? (
                <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{message.content}</Text>
            ) : null}

            <AiSummaryCards cards={message.cards} />
            <AiWarningBox warnings={message.warnings} />
            {(message.tables || []).map((table) => <AiBusinessTable key={table.title} table={table} />)}
            <AiSourceNote note={message.source_note} />
            <AiFollowUpActions followups={message.followups || answer?.followups} onSelect={onFollowup} />
        </Space>
    );
}
