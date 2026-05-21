import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, List, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function AiSuggestionList({ suggestions = [], onAccept, onReject }) {
    if (!suggestions.length) {
        return <Text type="secondary">No AI suggestions.</Text>;
    }

    return (
        <List
            size="small"
            dataSource={suggestions}
            renderItem={(s) => (
                <List.Item
                    actions={[
                        onAccept && (
                            <Button
                                key="accept"
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => onAccept(s)}
                            >
                                Accept
                            </Button>
                        ),
                        onReject && (
                            <Button
                                key="reject"
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => onReject(s)}
                            >
                                Reject
                            </Button>
                        ),
                    ].filter(Boolean)}
                >
                    <List.Item.Meta
                        title={
                            <Space size={4}>
                                <Text strong style={{ fontSize: 12 }}>{s.title}</Text>
                                <Tag color="blue">{s.suggestion_type}</Tag>
                                <Tag>{s.status}</Tag>
                            </Space>
                        }
                        description={
                            <Text type="secondary" style={{ fontSize: 11 }}>{s.summary}</Text>
                        }
                    />
                </List.Item>
            )}
        />
    );
}
