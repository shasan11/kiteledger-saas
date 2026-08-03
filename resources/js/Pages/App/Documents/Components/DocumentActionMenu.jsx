import { Button, Dropdown, Tooltip } from 'antd';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    MoreOutlined,
    PlusOutlined,
    ScanOutlined,
    SwapOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import { hasPerm } from '../Upload/documentUtils';

/*
 * Row actions for a document.
 *
 * Which action is offered depends on status, so the menu is the single place
 * that decides what a document can do next.
 */
export default function DocumentActionMenu({
    doc,
    permissions,
    canUpdate,
    onPreview,
    onEdit,
    onScan,
    onExtraction,
    onMatch,
    onReview,
    onCreateProposal,
    onDownload,
    onDelete,
    scanBusy = false,
}) {
    // 'queued' and 'processing' are deliberately excluded: a scan is already
    // in flight and the server would reject a second one anyway.
    const canScan = ['uploaded', 'failed', 'needs_review', 'extracted'].includes(doc.status)
        && !scanBusy
        && hasPerm(permissions, 'document_upload.scan_ai');

    const hasExtraction = !!doc.extraction;

    const items = [
        { key: 'preview', icon: <EyeOutlined />, label: 'Preview Document', onClick: onPreview },
        canUpdate && { key: 'edit', icon: <EditOutlined />, label: 'Edit Details', onClick: onEdit },
        {
            key: 'scan',
            icon: <ScanOutlined />,
            label: doc.status === 'failed' ? 'Retry AI Scan' : 'Run AI Scan',
            disabled: !canScan,
            onClick: onScan,
        },
        {
            key: 'extraction',
            icon: <FileTextOutlined />,
            label: 'View Extraction',
            disabled: !hasExtraction || !hasPerm(permissions, 'document_upload.extract.view'),
            onClick: onExtraction,
        },
        {
            key: 'match',
            icon: <ToolOutlined />,
            label: 'Entity Matches',
            disabled: !hasExtraction || !hasPerm(permissions, 'document_upload.entity_match'),
            onClick: onMatch,
        },
        {
            key: 'proposal',
            icon: <PlusOutlined />,
            label: 'Create Proposal',
            disabled: !hasExtraction || doc.status === 'converted',
            onClick: onCreateProposal,
        },
        {
            key: 'review',
            icon: <SwapOutlined />,
            label: doc.status === 'converted' ? 'Open Draft Record' : 'Review Transaction',
            disabled: !hasExtraction,
            onClick: onReview,
        },
        { key: 'download', icon: <DownloadOutlined />, label: 'Download', onClick: onDownload },
        hasPerm(permissions, 'document_upload.delete') && { type: 'divider' },
        hasPerm(permissions, 'document_upload.delete') && {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: onDelete,
        },
    ].filter(Boolean);

    return (
        <Dropdown menu={{ items }} trigger={['click']}>
            <Tooltip title="Actions">
                <Button icon={<MoreOutlined />} />
            </Tooltip>
        </Dropdown>
    );
}

