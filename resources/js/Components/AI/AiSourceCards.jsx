import { Button, Card, Collapse, Space, Tag, Typography } from 'antd';
import { FileSearchOutlined, LinkOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function SourceList({ sources }) {
    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {sources.map((source, index) => (
                <Card key={source.key || `${source.label}-${index}`} size="small" styles={{ body: { padding: 12 } }}>
                    <Space size={6} wrap style={{ marginBottom: 5 }}>
                        <Text strong>{source.label || 'KiteLedger source'}</Text>
                        {source.module && <Tag color="blue" bordered={false}>{source.module}</Tag>}
                        {source.type && <Tag bordered={false}>{source.type}</Tag>}
                        {source.status && <Tag bordered={false}>{source.status}</Tag>}
                        {source.match_label && <Tag color="geekblue" bordered={false}>{source.match_label}</Tag>}
                    </Space>
                    {source.date && <Text type="secondary" style={{ fontSize: 12 }}>{source.date}</Text>}
                    {source.snippet && (
                        <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ margin: '5px 0 8px', fontSize: 13 }}>
                            {source.snippet}
                        </Paragraph>
                    )}
                    {source.route && (
                        <Button type="link" size="small" href={source.route} icon={<LinkOutlined />} style={{ padding: 0 }}>
                            Open
                        </Button>
                    )}
                </Card>
            ))}
        </Space>
    );
}

export default function AiSourceCards({ sources = [] }) {
    if (!Array.isArray(sources) || sources.length === 0) return null;
    const label = <Space size={6}><FileSearchOutlined /><Text>Used sources ({sources.length})</Text></Space>;

    if (sources.length > 2) {
        return <Collapse ghost size="small" items={[{ key: 'sources', label, children: <SourceList sources={sources} /> }]} />;
    }

    return <div style={{ marginTop: 6 }}>{label}<div style={{ marginTop: 8 }}><SourceList sources={sources} /></div></div>;
}
