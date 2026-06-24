import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Space, Table, Tag, Typography } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    SafetyCertificateOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const RISK_COLOR = {
    low: 'green',
    medium: 'gold',
    high: 'orange',
    critical: 'red',
};

function humanizeKey(key) {
    return String(key)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PreviewBlock({ preview }) {
    if (!preview || typeof preview !== 'object') return null;

    const { items, ...rest } = preview;
    const scalarEntries = Object.entries(rest).filter(
        ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
    );

    return (
        <>
            {scalarEntries.length > 0 && (
                <Descriptions size="small" column={1} bordered style={{ marginBottom: items ? 10 : 0 }}>
                    {scalarEntries.map(([key, value]) => (
                        <Descriptions.Item key={key} label={humanizeKey(key)}>
                            {String(value)}
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            )}

            {Array.isArray(items) && items.length > 0 && (
                <Table
                    size="small"
                    pagination={false}
                    rowKey={(_, i) => i}
                    dataSource={items}
                    columns={Object.keys(items[0]).map((key) => ({
                        title: humanizeKey(key),
                        dataIndex: key,
                        key,
                    }))}
                />
            )}
        </>
    );
}

function BeforeAfterBlock({ before, after }) {
    if (!before && !after) return null;
    const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
    if (keys.length === 0) return null;

    return (
        <Table
            size="small"
            pagination={false}
            rowKey="field"
            dataSource={keys.map((k) => ({
                field: humanizeKey(k),
                before: before?.[k] ?? '—',
                after: after?.[k] ?? '—',
            }))}
            columns={[
                { title: 'Field', dataIndex: 'field', key: 'field' },
                { title: 'Before', dataIndex: 'before', key: 'before' },
                { title: 'After', dataIndex: 'after', key: 'after', render: (v) => <Text strong>{String(v)}</Text> },
            ]}
        />
    );
}

/**
 * Renders an AI-proposed pending action: risk, preview / before-after, warnings,
 * and approve/reject controls. High/critical actions require the user to type a
 * confirmation phrase before Approve is enabled.
 */
export default function AiPendingActionCard({ action, state = {}, onApprove, onReject }) {
    const [confirmInput, setConfirmInput] = useState('');

    if (!action) return null;

    const status = state.status || action.status || 'pending';
    const loading = !!state.loading;
    const result = state.result || null;
    const error = state.error || null;

    const risk = action.risk_level || 'medium';
    const needsConfirmation =
        action.requires_confirmation || ['high', 'critical'].includes(risk);
    const confirmationText = action.confirmation_text || null;
    const missingFields = action.missing_fields || [];
    const isResolved = ['executed', 'rejected', 'failed'].includes(status);
    const confirmOk = !needsConfirmation || !confirmationText || confirmInput.trim() === confirmationText;

    return (
        <Card
            size="small"
            style={{ marginTop: 12, borderColor: risk === 'critical' ? '#ff4d4f' : undefined }}
            title={
                <Space size={8} wrap>
                    <SafetyCertificateOutlined />
                    <Text strong>{action.title || humanizeKey(action.action_type || 'Action')}</Text>
                    <Tag color={RISK_COLOR[risk] || 'default'} bordered={false}>
                        {risk} risk
                    </Tag>
                    {isResolved && (
                        <Tag color={status === 'executed' ? 'success' : status === 'rejected' ? 'default' : 'error'} bordered={false}>
                            {status}
                        </Tag>
                    )}
                </Space>
            }
        >
            {action.summary && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
                    {action.summary}
                </Text>
            )}

            <PreviewBlock preview={action.preview} />
            <BeforeAfterBlock before={action.before} after={action.after} />

            {Array.isArray(action.risk_reasons) && action.risk_reasons.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginTop: 10 }}
                    message="Review before approval"
                    description={
                        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                            {action.risk_reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                            ))}
                        </ul>
                    }
                />
            )}

            {missingFields.length > 0 && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 10 }}
                    message="More detail needed"
                    description="This draft is missing required fields. Add them in chat before approving."
                />
            )}

            {error && <Alert type="error" showIcon style={{ marginTop: 10 }} message={error} />}

            {result && status === 'executed' && (
                <Alert
                    type="success"
                    showIcon
                    style={{ marginTop: 10 }}
                    message={result.message || 'Action completed.'}
                    description={
                        result.open_url ? (
                            <a href={result.open_url}>Open the created record →</a>
                        ) : null
                    }
                />
            )}

            {!isResolved && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 10, marginBottom: 10 }}
                        message="AI prepared this action. Review carefully before approval — it will only run after you approve."
                    />

                    {needsConfirmation && confirmationText && (
                        <Input
                            placeholder={`Type "${confirmationText}" to confirm`}
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            style={{ marginBottom: 10 }}
                            disabled={loading}
                        />
                    )}

                    <Space>
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            loading={loading}
                            disabled={missingFields.length > 0 || !confirmOk}
                            onClick={() => onApprove?.(action, confirmInput.trim())}
                        >
                            Approve
                        </Button>
                        <Button
                            danger
                            icon={<CloseCircleOutlined />}
                            disabled={loading}
                            onClick={() => onReject?.(action)}
                        >
                            Reject
                        </Button>
                    </Space>
                </>
            )}
        </Card>
    );
}
