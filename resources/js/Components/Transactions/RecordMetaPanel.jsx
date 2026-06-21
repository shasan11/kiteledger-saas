import { Descriptions, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const formatDateTime = (value) => {
    if (!value) return '-';
    const d = dayjs(value);
    return d.isValid() ? d.format('DD-MM-YYYY HH:mm') : '-';
};

const userLabel = (user) => {
    if (!user) return null;
    return user.name || user.username || user.email || null;
};

/**
 * Branch / Created By / Created At / Approved By / Approved At meta panel for
 * transaction show pages. Designed to be dropped into any of the 17
 * transaction modules without per-module customization.
 *
 * Expected shape (any subset is fine — missing fields render as "-"):
 *   record.branch?.{ name, code }
 *   record.userAdd | creator | created_by_user?.{ name, username, email }
 *   record.approvedBy | approver | approved_by_user?.{ name, username, email }
 *   record.created_at, record.approved_at
 *   record.approved (boolean)
 */
export default function RecordMetaPanel({ record, column = { xs: 1, sm: 2, md: 3 }, size = 'small', bordered = true, className, style }) {
    if (!record) return null;

    const branch = record.branch;
    const branchLabel = branch
        ? (branch.code ? `${branch.name || ''} (${branch.code})` : branch.name)
        : null;

    const createdBy = userLabel(record.userAdd || record.creator || record.created_by_user);
    const approvedBy = userLabel(record.approvedBy || record.approver || record.approved_by_user);

    return (
        <Descriptions
            size={size}
            bordered={bordered}
            column={column}
            className={className}
            style={style}
        >
            <Descriptions.Item label="Branch">
                {branchLabel || <Text type="secondary">-</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
                {createdBy || <Text type="secondary">-</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
                {formatDateTime(record.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Approved By">
                {approvedBy || <Text type="secondary">-</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Approved At">
                {record.approved_at
                    ? formatDateTime(record.approved_at)
                    : record.approved
                        ? <Tag color="green">Approved</Tag>
                        : <Text type="secondary">-</Text>}
            </Descriptions.Item>
        </Descriptions>
    );
}
