import React from 'react';
import { Alert, Descriptions, Empty, Table, Tag, Tooltip, Typography } from 'antd';

const { Text } = Typography;

const STATUS_COLOR = {
  passed: 'success',
  warning: 'warning',
  error: 'error',
  not_applicable: 'default',
};

const humanize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString('en-NP', { maximumFractionDigits: 4 });
  return String(value);
};

export default function BusinessRuleSummary({ result }) {
  const checks = Array.isArray(result?.checks) ? result.checks : [];

  if (!checks.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No validation checks available" />;
  }

  const status = result?.has_errors
    ? { type: 'error', message: 'Approval blocked' }
    : result?.has_warnings
      ? { type: 'warning', message: 'Approved with warnings' }
      : { type: 'success', message: 'Ready to approve' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert showIcon type={status.type} message={status.message} />

      <Table
        size="small"
        rowKey={(row, index) => `${row.key}-${index}`}
        pagination={false}
        scroll={{ x: 780 }}
        dataSource={checks}
        columns={[
          { title: 'Rule', dataIndex: 'label', width: 180 },
          {
            title: 'Setting',
            dataIndex: 'setting',
            width: 110,
            render: (value) => <Tag>{humanize(value)}</Tag>,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            render: (value) => <Tag color={STATUS_COLOR[value] || 'default'}>{humanize(value)}</Tag>,
          },
          {
            title: 'Message',
            dataIndex: 'message',
            render: (value) => (
              <Tooltip title={value}>
                <Text ellipsis style={{ maxWidth: 320 }}>{value}</Text>
              </Tooltip>
            ),
          },
          {
            title: 'Action',
            dataIndex: 'can_continue',
            width: 110,
            render: (value, row) => (row.status === 'error' || value === false ? 'Blocked' : 'Allowed'),
          },
        ]}
        expandable={{
          rowExpandable: (row) => row.details && Object.keys(row.details).length > 0,
          expandedRowRender: (row) => (
            <Descriptions size="small" column={2} bordered>
              {Object.entries(row.details || {}).map(([key, value]) => (
                <Descriptions.Item key={key} label={humanize(key)}>
                  {formatValue(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ),
        }}
      />
    </div>
  );
}
