import { Card, Empty, Table, Typography } from 'antd';

const { Text } = Typography;

function renderValue(value, format) {
    if (format === 'money') {
        return `NPR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value ?? '';
}

export default function AiBusinessTable({ table }) {
    if (!table) return null;

    const columns = (table.columns || []).map((column) => ({
        title: column.label,
        dataIndex: column.key,
        key: column.key,
        ellipsis: true,
        align: column.format === 'money' ? 'right' : 'left',
        render: (value) => renderValue(value, column.format),
    }));

    return (
        <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
            <Text strong>{table.title}</Text>
            {Array.isArray(table.rows) && table.rows.length ? (
                <Table
                    size="small"
                    rowKey={(row, index) => `${table.title}-${index}`}
                    columns={columns}
                    dataSource={table.rows}
                    pagination={table.rows.length > 8 ? { pageSize: 8, size: 'small' } : false}
                    scroll={{ x: true }}
                    style={{ marginTop: 8 }}
                />
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rows to show" />
            )}
        </Card>
    );
}
