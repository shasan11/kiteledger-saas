import { Card, Space, Tag, Typography } from 'antd';
import { FileSearchOutlined, LinkOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

/**
 * Renders RAG citation/source cards returned by the assistant. Shows module,
 * title, snippet, relevance score, and a deep link to open the real record.
 * Numbers are never generated — these always point at actual records.
 */
export default function AiSourceCards({ sources = [] }) {
    if (!Array.isArray(sources) || sources.length === 0) return null;

    return (
        <div style={{ marginTop: 12 }}>
            <Space size={6} style={{ marginBottom: 6 }}>
                <FileSearchOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Sources ({sources.length}) — open a record for exact figures
                </Text>
            </Space>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {sources.map((s, i) => {
                    const route = s?.metadata?.route || null;
                    const score = typeof s.score === 'number' ? Math.round(s.score * 100) : null;

                    return (
                        <Card key={s.source_public_id || i} size="small" styles={{ body: { padding: 12 } }}>
                            <Space size={6} wrap style={{ marginBottom: 4 }}>
                                {s.module && (
                                    <Tag color="blue" bordered={false}>
                                        {s.module}
                                    </Tag>
                                )}
                                <Text strong>{s.title || 'Record'}</Text>
                                {s?.metadata?.status && (
                                    <Tag bordered={false}>{s.metadata.status}</Tag>
                                )}
                                {score !== null && (
                                    <Tag color="geekblue" bordered={false}>
                                        {score}% match
                                    </Tag>
                                )}
                            </Space>

                            {s.snippet && (
                                <Paragraph
                                    type="secondary"
                                    style={{ fontSize: 13, marginBottom: route ? 6 : 0 }}
                                    ellipsis={{ rows: 2 }}
                                >
                                    {s.snippet}
                                </Paragraph>
                            )}

                            {route && (
                                <a href={route}>
                                    <Space size={4}>
                                        <LinkOutlined />
                                        Open record
                                    </Space>
                                </a>
                            )}
                        </Card>
                    );
                })}
            </Space>
        </div>
    );
}
