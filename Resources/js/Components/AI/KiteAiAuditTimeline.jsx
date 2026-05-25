import { Timeline, Typography, theme } from 'antd';

const { Text } = Typography;

const STATUS_COLOR = {
    proposed: 'blue',
    approved: 'green',
    rejected: 'red',
    executed: 'green',
    failed:   'red',
};

export default function KiteAiAuditTimeline({ entries = [] }) {
    const { token } = theme.useToken();

    if (!entries.length) {
        return <Text type="secondary" style={{ fontSize: 12 }}>No audit history yet.</Text>;
    }

    return (
        <Timeline
            style={{ marginTop: 8, paddingInlineStart: 4 }}
            items={entries.map((e) => ({
                color: STATUS_COLOR[e.status] ?? 'gray',
                children: (
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{e.action_type}</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                            {new Date(e.created_at).toLocaleString()}
                        </Text>
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                            {e.status} · {e.module || '—'}
                        </div>
                    </div>
                ),
            }))}
        />
    );
}
