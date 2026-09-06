import { Typography } from 'antd';
import { ExclamationCircleFilled, RightOutlined, WarningFilled } from '@ant-design/icons';

const { Text } = Typography;

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
    const issues = Object.values(review?.fields || {}).filter((f) => f.needs_review);
    const blocking = issues.filter((i) => i.state === 'missing' || i.state === 'conflict');

    if (issues.length === 0) return null;

    return (
        <aside className="document-review__issues" aria-label="Items requiring review">
            <div className="document-review__issues-heading">
                <span className="document-review__issues-icon"><WarningFilled /></span>
                <div>
                    <Text strong>{issues.length} {issues.length === 1 ? 'detail needs' : 'details need'} your attention</Text>
                    <Text type="secondary">
                        {blocking.length > 0
                            ? `${blocking.length} ${blocking.length === 1 ? 'issue is' : 'issues are'} blocking draft creation.`
                            : 'Review these uncertain values before continuing.'}
                    </Text>
                </div>
            </div>

            <div className="document-review__issue-list">
                {issues.map((issue) => {
                    const label = fieldLabel(issue.key);
                    const describe = STATE_MESSAGE[issue.state] || (() => `${label} needs review`);
                    const isBlocking = issue.state === 'missing' || issue.state === 'conflict';

                    return (
                        <button
                            key={issue.key}
                            type="button"
                            className="document-review__issue"
                            onClick={() => onSelectIssue?.(issue)}
                        >
                            <span className={`document-review__issue-state${isBlocking ? ' is-blocking' : ''}`}>
                                {isBlocking ? <ExclamationCircleFilled /> : <WarningFilled />}
                            </span>
                            <span className="document-review__issue-copy">
                                <Text strong>{describe(label)}</Text>
                                {issue.warnings?.[0] && <Text type="secondary">{issue.warnings[0]}</Text>}
                            </span>
                            <span className="document-review__issue-action">Review <RightOutlined /></span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
