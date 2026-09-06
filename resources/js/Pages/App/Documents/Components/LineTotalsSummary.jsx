import { forwardRef } from 'react';
import { InputNumber, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { CalculatorOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

/*
 * Reading order of a real invoice: what the goods cost, what was taken off,
 * what was added, then the one number that matters, then what is still owed.
 */
const ROWS = [
    { key: 'totals.subtotal', label: 'Subtotal' },
    { key: 'totals.discount_total', label: 'Discount', negative: true },
    { key: 'totals.tax_total', label: 'Tax' },
    { key: 'totals.shipping', label: 'Shipping' },
    { key: 'totals.grand_total', label: 'Total', emphasis: true, dividerBefore: true },
    { key: 'totals.paid_amount', label: 'Amount paid' },
    { key: 'totals.balance_due', label: 'Balance due', emphasis: true },
];

/**
 * The totals block that sits under the line items, where a transaction form
 * puts it.
 *
 * These were a stack of labelled inputs in a separate card, which read as
 * seven unrelated fields rather than one sum. Here the arithmetic is visible:
 * the numbers line up in a column, the total is the heavy one, and a figure
 * KiteLedger worked out itself still says so — approving a derived total that
 * nobody checked is how a wrong figure reaches the ledger.
 */
const LineTotalsSummary = forwardRef(function LineTotalsSummary(
    { fields = {}, currency, onChange, fieldRefs, editableKeys = ['totals.discount_total', 'totals.tax_total'] },
    ref,
) {
    const { token } = theme.useToken();

    const rows = ROWS.filter((row) => fields[row.key]);

    if (rows.length === 0) return null;

    return (
        <div ref={ref} className="document-line-totals" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    {rows.map((row) => {
                        const field = fields[row.key];
                        const needsAttention = field.needs_review;
                        const isConflict = field.state === 'conflict';
                        const isDerived = field.origin === 'derived';
                        const isEditable = editableKeys.includes(row.key);
                        const numericValue = field.value === '' || field.value === null
                            ? null
                            : Number(field.value);
                        const displayValue = numericValue === null || !Number.isFinite(numericValue)
                            ? '—'
                            : new Intl.NumberFormat(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }).format(row.negative ? Math.abs(numericValue) : numericValue);

                        return (
                            <div
                                key={row.key}
                                ref={(node) => {
                                    if (fieldRefs) fieldRefs.current[row.key] = node;
                                }}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(110px, 1fr) minmax(150px, auto)',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '6px 8px',
                                    borderRadius: token.borderRadius,
                                    borderTop: row.dividerBefore ? `1px solid ${token.colorBorderSecondary}` : undefined,
                                    marginTop: row.dividerBefore ? 6 : 0,
                                    paddingTop: row.dividerBefore ? 12 : 6,
                                    background: needsAttention ? token.colorWarningBg : undefined,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                                    <Text
                                        strong={row.emphasis}
                                        style={{ fontSize: row.emphasis ? 14 : 13, whiteSpace: 'nowrap' }}
                                        type={row.emphasis ? undefined : 'secondary'}
                                    >
                                        {row.label}
                                    </Text>

                                    {/* A figure nobody printed on the page says so. */}
                                    {isDerived && (
                                        <Tooltip title={field.warnings?.[0] || field.origin_label}>
                                            <Tag bordered={false} color="blue" icon={<CalculatorOutlined />} style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                                Calculated
                                            </Tag>
                                        </Tooltip>
                                    )}

                                    {needsAttention && !isDerived && (
                                        <Tooltip title={field.warnings?.[0]}>
                                            <Tag bordered={false} color="warning" icon={<WarningOutlined />} style={{ fontSize: 11, marginInlineEnd: 0 }}>
                                                {field.state_label}
                                            </Tag>
                                        </Tooltip>
                                    )}
                                </div>

                                <Space direction="vertical" size={2} align="end" style={{ minWidth: 0 }}>
                                    <Space size={4}>
                                        {row.negative && <Text type="secondary">−</Text>}
                                        {currency && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {currency}
                                            </Text>
                                        )}
                                        {isEditable ? (
                                            <InputNumber
                                                className="document-line-total-input"
                                                min={0}
                                                value={field.value === '' || field.value === null ? null : field.value}
                                                onChange={(value) => onChange?.(field.key, value)}
                                                status={isConflict ? 'error' : undefined}
                                                controls={false}
                                                placeholder={field.state === 'missing' ? 'Not found' : undefined}
                                                style={{
                                                    width: 130,
                                                    textAlign: 'right',
                                                    fontWeight: row.emphasis ? 600 : 400,
                                                    fontSize: row.emphasis ? 16 : 14,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            />
                                        ) : (
                                            <Text
                                                className={`document-line-total-value${isConflict ? ' is-conflict' : ''}`}
                                                strong={row.emphasis}
                                                type={field.state === 'missing' ? 'secondary' : undefined}
                                            >
                                                {displayValue}
                                            </Text>
                                        )}
                                    </Space>

                                    {isConflict && field.conflict_value != null && (
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Lines add up to {field.conflict_value}
                                            {isEditable && (
                                                <a style={{ marginLeft: 6 }} onClick={() => onChange?.(field.key, field.conflict_value)}>
                                                    Use this
                                                </a>
                                            )}
                                        </Text>
                                    )}
                                </Space>
                            </div>
                        );
                    })}
                </Space>
            </div>
        </div>
    );
});

export default LineTotalsSummary;
