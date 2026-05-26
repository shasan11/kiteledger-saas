import { Tag } from 'antd';

/**
 * Render branch info for a transaction record. Tries the eager-loaded
 * `record.branch` relation first, then falls back to flat fields the API
 * sometimes returns (`branch_name`, `branch_code`).
 */
export function BranchCellRender(_value, record) {
    const branch = record?.branch;
    const name = branch?.name || record?.branch_name;
    const code = branch?.code || record?.branch_code;

    if (!name && !code) {
        return <span style={{ color: '#999' }}>-</span>;
    }

    return (
        <span style={{ whiteSpace: 'nowrap' }}>
            {name || '-'}
            {code ? (
                <Tag style={{ marginLeft: 6 }} color="geekblue">
                    {code}
                </Tag>
            ) : null}
        </span>
    );
}

/**
 * Build an Ant Design Table column definition for a Branch column.
 * Pass `overrides` to customize width, title, filter wiring, etc.
 *
 * Usage:
 *   const columns = useMemo(() => [
 *     branchColumn(),
 *     ...rest,
 *   ], []);
 */
export function branchColumn(overrides = {}) {
    return {
        title: 'Branch',
        dataIndex: 'branch',
        key: 'branch',
        width: 160,
        render: BranchCellRender,
        ...overrides,
    };
}

export default branchColumn;
