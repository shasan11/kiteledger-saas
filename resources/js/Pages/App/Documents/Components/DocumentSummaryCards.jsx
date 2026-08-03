import { Card, Col, Row, Skeleton, Typography, theme } from 'antd';
import {
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    InboxOutlined,
    LoadingOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/*
 * Counts cover the whole filtered dataset, not the current page — a "3 need
 * review" that only counts page one is worse than showing nothing, because it
 * reads as complete.
 */
const CARDS = [
    { key: 'uploaded', label: 'Uploaded', icon: <InboxOutlined />, tone: 'default' },
    { key: 'processing', label: 'Processing', icon: <LoadingOutlined />, tone: 'processing' },
    { key: 'needs_review', label: 'Needs review', icon: <WarningOutlined />, tone: 'warning' },
    { key: 'converted', label: 'Converted', icon: <CheckCircleOutlined />, tone: 'success' },
    { key: 'failed', label: 'Failed', icon: <ExclamationCircleOutlined />, tone: 'error' },
];

export default function DocumentSummaryCards({ summary, loading = false, onSelect, activeStatus }) {
    const { token } = theme.useToken();

    const toneColor = {
        default: token.colorTextTertiary,
        processing: token.colorInfo,
        warning: token.colorWarning,
        success: token.colorSuccess,
        error: token.colorError,
    };

    if (loading && !summary) {
        return (
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {CARDS.map((card) => (
                    <Col xs={12} sm={8} lg={4} key={card.key}>
                        <Card size="small">
                            <Skeleton active paragraph={false} title={{ width: '60%' }} />
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    }

    if (!summary) return null;

    return (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {CARDS.map((card) => {
                const count = Number(summary[card.key] ?? 0);
                const isActive = activeStatus === card.key;

                return (
                    <Col xs={12} sm={8} lg={4} key={card.key}>
                        <Card
                            size="small"
                            hoverable={Boolean(onSelect)}
                            onClick={() => onSelect?.(isActive ? undefined : card.key)}
                            style={{
                                borderColor: isActive ? token.colorPrimary : undefined,
                                cursor: onSelect ? 'pointer' : 'default',
                            }}
                            styles={{ body: { padding: '10px 12px' } }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: toneColor[card.tone], fontSize: 15 }}>
                                    {card.icon}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    {/* Tabular figures so counts do not shift
                                        the label as they change. */}
                                    <div
                                        style={{
                                            fontSize: 20,
                                            lineHeight: 1.1,
                                            fontWeight: 600,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {count}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                                        {card.label}
                                    </Text>
                                </div>
                            </div>
                        </Card>
                    </Col>
                );
            })}

            <Col xs={12} sm={8} lg={4}>
                <Card size="small" styles={{ body: { padding: '10px 12px' } }}>
                    <div
                        style={{
                            fontSize: 20,
                            lineHeight: 1.1,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {Number(summary.total ?? 0)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Total
                    </Text>
                </Card>
            </Col>
        </Row>
    );
}
