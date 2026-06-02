import { Space, Typography } from 'antd';
import AiSummaryCards from './AiSummaryCards';
import AiBusinessTable from './AiBusinessTable';
import AiSourceNote from './AiSourceNote';
import AiWarningBox from './AiWarningBox';
import AiFollowUpActions from './AiFollowUpActions';

const { Text } = Typography;

export default function AiMessageRenderer({ message = {}, onFollowup }) {
    const hasStructured =
        (message.cards || []).length ||
        (message.tables || []).length ||
        (message.warnings || []).length ||
        message.source_note ||
        (message.followups || []).length;

    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {message.content && <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>}
            {hasStructured && (
                <>
                    <AiSummaryCards cards={message.cards} />
                    <AiWarningBox warnings={message.warnings} />
                    {(message.tables || []).map((table) => (
                        <AiBusinessTable key={table.title} table={table} />
                    ))}
                    <AiSourceNote note={message.source_note} />
                    <AiFollowUpActions followups={message.followups} onSelect={onFollowup} />
                </>
            )}
        </Space>
    );
}
