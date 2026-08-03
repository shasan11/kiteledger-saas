import { Progress, Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

/*
 * Stage-based progress.
 *
 * Deliberately not a percentage of the work done: nothing can know how far
 * through reading a document the model is, so any number would be fabricated.
 * Naming the current step is honest and just as reassuring. The bar shows
 * position in the pipeline, which is a real, countable thing.
 */
export default function DocumentProcessingTimeline({ stage, startedAt, compact = false }) {
    if (!stage || stage.is_terminal) return null;

    const percent = stage.total ? Math.round((stage.position / stage.total) * 100) : 0;

    const elapsed = startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
        : null;

    if (compact) {
        return (
            <Space size={6}>
                <LoadingOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {stage.label}
                </Text>
            </Space>
        );
    }

    return (
        <div style={{ maxWidth: 420 }}>
            <Space size={8} style={{ marginBottom: 6 }}>
                <LoadingOutlined />
                <Text strong>{stage.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Step {stage.position} of {stage.total}
                </Text>
            </Space>

            <Progress percent={percent} showInfo={false} size="small" status="active" />

            <Text type="secondary" style={{ fontSize: 12 }}>
                {elapsed !== null ? `Running for ${elapsed}s. ` : ''}
                You can safely leave this page — processing continues in the background.
            </Text>
        </div>
    );
}
