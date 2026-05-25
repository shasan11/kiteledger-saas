import { List, Tag, Typography, theme } from 'antd';

const { Text } = Typography;

export default function KiteAiSourceList({ sources = [] }) {
    const { token } = theme.useToken();

    if (!sources.length) return null;

    return (
        <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Sources
            </Text>
            <List
                size="small"
                dataSource={sources}
                renderItem={(s) => (
                    <List.Item style={{ paddingInline: 0, borderColor: token.colorBorderSecondary }}>
                        <Tag color="default" style={{ marginInlineEnd: 6 }}>{s.type || s.category || 'source'}</Tag>
                        <Text style={{ fontSize: 12 }}>
                            {s.id || s.report_key || ''}
                        </Text>
                    </List.Item>
                )}
            />
        </div>
    );
}
