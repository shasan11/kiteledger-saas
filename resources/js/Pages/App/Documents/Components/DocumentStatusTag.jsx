import { Tag } from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    InboxOutlined,
    LoadingOutlined,
    WarningOutlined,
} from '@ant-design/icons';

/*
 * One place that decides how a document status looks.
 *
 * Colour semantics are fixed across the feature: green = done/verified,
 * amber = needs a person, red = blocked, blue = working, gray = inactive.
 */
export const DOCUMENT_STATUS = {
    uploaded: { label: 'Uploaded', color: 'default', icon: <InboxOutlined /> },
    queued: { label: 'Waiting to start', color: 'blue', icon: <ClockCircleOutlined /> },
    processing: { label: 'Processing', color: 'blue', icon: <LoadingOutlined /> },
    extracted: { label: 'Extracted', color: 'cyan', icon: <FileTextOutlined /> },
    needs_review: { label: 'Needs review', color: 'gold', icon: <WarningOutlined /> },
    ready: { label: 'Ready to create', color: 'green', icon: <CheckCircleOutlined /> },
    converted: { label: 'Converted', color: 'green', icon: <CheckCircleOutlined /> },
    failed: { label: 'Failed', color: 'red', icon: <ExclamationCircleOutlined /> },
    archived: { label: 'Archived', color: 'default', icon: <InboxOutlined /> },
};

export default function DocumentStatusTag({ status, issueCount = 0 }) {
    const meta = DOCUMENT_STATUS[status] || DOCUMENT_STATUS.uploaded;

    // The issue count is the actionable part of "needs review", so it belongs
    // in the badge itself rather than in a separate column the eye has to find.
    const label =
        status === 'needs_review' && issueCount > 0
            ? `${issueCount} to review`
            : meta.label;

    return (
        <Tag color={meta.color} icon={meta.icon} bordered={false} style={{ marginInlineEnd: 0 }}>
            {label}
        </Tag>
    );
}
