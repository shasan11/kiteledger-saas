import { Button, Space, Typography } from 'antd';

const { Text } = Typography;

export default function AiFollowUpActions({ followups = [], onSelect }) {
    if (!Array.isArray(followups) || followups.length === 0) return null;

    return (
        <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 10 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Follow-up questions</Text>
            <Space wrap size={[6, 6]}>
                {followups.map((item) => (
                    <Button key={item} size="small" onClick={() => onSelect?.(item)}>
                        {item}
                    </Button>
                ))}
            </Space>
        </Space>
    );
}
