import { Alert, Button, Card, Empty, List, Space, Typography, theme } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/*
 * Human-readable names for field keys. The user never sees a dotted path.
 */
const FIELD_LABELS = {
    'document_type': 'Document type',
    'document_number': 'Document number',
    'document_date': 'Document date',
    'due_date': 'Due date',
    'currency_code': 'Currency',
    'party.name': 'Supplier or customer',
    'party.tax_number': 'Tax number',
    'party.email': 'Email',
    'party.phone': 'Phone',
    'totals.subtotal': 'Subtotal',
    'totals.tax_total': 'Tax',
    'totals.discount_total': 'Discount',
    'totals.shipping': 'Shipping',
    'totals.grand_total': 'Total',
    'totals.paid_amount': 'Amount paid',
    'totals.balance_due': 'Balance due',
};

const STATE_MESSAGE = {
    missing: (label) => `${label} could not be found`,
    conflict: (label) => `${label} does not match the calculated value`,
    low_confidence: (label) => `${label} was hard to read`,
    unmatched: (label) => `${label} is not matched to a KiteLedger record`,
};

export function fieldLabel(key) {
    return FIELD_LABELS[key] || key;
}

/**
 * The checklist that drives the whole review.
 *
 * Rather than presenting every extracted field as equally important, this lists
 * only what needs a person and sends them straight to it. A document that read
 * cleanly shows a confirmation, not an empty form.
 */
export default function ReviewIssuePanel({ review, onSelectIssue }) {
    const { token } = theme.useToken();

    const issues = Object.values(review?.fields || {}).filter((f) => f.needs_review);
    const blocking = issues.filter((i) => i.state === 'missing' || i.state === 'conflict');

    if (issues.length === 0) {
        return (
            <Card size="small" style={{ borderColor: token.colorSuccessBorder }}>
                <Space align="start">
                    <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 18 }} />
                    <div>
                        <Text strong>Nothing needs your review</Text>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Everything was read clearly and the totals add up.
                            </Text>
                        </div>
                    </div>
                </Space>
            </Card>
        );
    }

    return (
        <Card
            size="small"
            title={
                <Space size={8}>
                    <WarningOutlined style={{ color: token.colorWarning }} />
                    <Title level={5} style={{ margin: 0 }}>
                        {issues.length} {issues.length === 1 ? 'item needs' : 'items need'} your review
                    </Title>
                </Space>
            }
        >
            {blocking.length > 0 && (
                <Alert
                    type="error"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    style={{ marginBottom: 12 }}
                    message={`${blocking.length} must be resolved before a draft can be created`}
                />
            )}

            <List
                size="small"
                dataSource={issues}
                locale={{ emptyText: <Empty description="No issues" /> }}
                renderItem={(issue, index) => {
                    const label = fieldLabel(issue.key);
                    const describe = STATE_MESSAGE[issue.state] || (() => `${label} needs review`);

                    return (
                        <List.Item
                            style={{ paddingInline: 0 }}
                            actions={[
                                <Button
                                    key="fix"
                                    size="small"
                                    type="link"
                                    onClick={() => onSelectIssue?.(issue)}
                                >
                                    Fix
                                </Button>,
                            ]}
                        >
                            <Space align="start" size={8}>
                                <Text type="secondary" style={{ fontSize: 12, minWidth: 16 }}>
                                    {index + 1}.
                                </Text>
                                <div>
                                    <Text style={{ fontSize: 13 }}>{describe(label)}</Text>
                                    {issue.warnings?.[0] && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {issue.warnings[0]}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </Space>
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
}
