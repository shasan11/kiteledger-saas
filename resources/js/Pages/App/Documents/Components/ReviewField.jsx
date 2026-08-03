import { forwardRef } from 'react';
import { Input, Space, Tag, Tooltip, Typography, theme } from 'antd';
import {
    CalculatorOutlined,
    CheckCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    FileSearchOutlined,
    WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

/*
 * Tone -> visual treatment. Only fields that need a person get colour; a clean
 * field stays quiet so the eye lands on the two or three that matter.
 */
const TONE = {
    green: { color: 'success', icon: <CheckCircleOutlined /> },
    amber: { color: 'warning', icon: <WarningOutlined /> },
    red: { color: 'error', icon: <ExclamationCircleOutlined /> },
};

const ORIGIN_ICON = {
    extracted: <FileSearchOutlined />,
    derived: <CalculatorOutlined />,
    user: <EditOutlined />,
};

/**
 * One reviewable field.
 *
 * The origin badge is the important part: a value KiteLedger calculated is
 * labelled "Calculated" rather than shown as though it were printed on the
 * page. Approving a derived total that nobody flagged is how a wrong figure
 * reaches the ledger.
 */
const ReviewField = forwardRef(function ReviewField(
    { field, label, onChange, onFocusEvidence, disabled = false },
    ref,
) {
    const { token } = theme.useToken();

    if (!field) return null;

    const tone = TONE[field.tone] || {};
    const needsAttention = field.needs_review;
    const isDerived = field.origin === 'derived';
    const isConflict = field.state === 'conflict';

    return (
        <div
            ref={ref}
            style={{
                padding: 12,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${needsAttention ? token.colorWarningBorder : token.colorBorderSecondary}`,
                background: needsAttention ? token.colorWarningBg : token.colorBgContainer,
                transition: 'background 0.2s, border-color 0.2s',
            }}
        >
            <Space size={6} style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13 }}>
                    {label}
                </Text>

                {/* Origin is always visible for anything not read straight off the page. */}
                {field.origin !== 'extracted' && (
                    <Tooltip title={field.warnings?.[0] || field.origin_label}>
                        <Tag
                            bordered={false}
                            color={isDerived ? 'blue' : 'default'}
                            icon={ORIGIN_ICON[field.origin]}
                            style={{ marginInlineEnd: 0, fontSize: 11 }}
                        >
                            {field.origin_label}
                        </Tag>
                    </Tooltip>
                )}

                {needsAttention && (
                    <Tag
                        bordered={false}
                        color={tone.color}
                        icon={tone.icon}
                        style={{ marginInlineEnd: 0, fontSize: 11 }}
                    >
                        {field.state_label}
                    </Tag>
                )}
            </Space>

            <Input
                value={field.value ?? ''}
                onChange={(e) => onChange?.(field.key, e.target.value)}
                onFocus={() => onFocusEvidence?.(field)}
                disabled={disabled}
                status={isConflict ? 'error' : undefined}
                placeholder={field.state === 'missing' ? 'Not found — please enter' : undefined}
            />

            {/* A conflict shows both numbers and lets the user decide; KiteLedger
                never silently overwrites what the document says. */}
            {isConflict && field.conflict_value != null && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {field.warnings?.[0]}
                    </Text>
                    <div style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 12 }}>
                            KiteLedger calculated{' '}
                            <Text strong>{field.conflict_value}</Text>
                        </Text>
                        <a
                            style={{ marginLeft: 8, fontSize: 12 }}
                            onClick={() => onChange?.(field.key, field.conflict_value)}
                        >
                            Use this
                        </a>
                    </div>
                </div>
            )}

            {field.edited_by_user && field.original_value != null && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                    Document showed: {field.original_value}
                </Text>
            )}

            {/* Evidence, only when it genuinely exists. Never a fabricated location. */}
            {!isDerived && field.evidence?.[0]?.text && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                    Found on page {field.evidence[0].page ?? '?'}: “{field.evidence[0].text}”
                </Text>
            )}
        </div>
    );
});

export default ReviewField;
