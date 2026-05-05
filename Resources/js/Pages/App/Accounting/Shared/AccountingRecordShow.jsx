import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, Card, Descriptions, Empty, Skeleton, Space, Table, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const hiddenKeys = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'value', 'label']);

const humanize = (key = '') =>
  key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());

const isPlainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return <Tag color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Tag>;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(value.includes('T') ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD') : value;
  }
  if (isPlainObject(value)) {
    return value.label || value.name || value.display_name || value.code || value.title || '-';
  }
  return String(value);
};

export default function AccountingRecordShow({
  id,
  title,
  endpoint,
  backRoute,
  backLabel,
  titleField = 'name',
  subtitleField,
}) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await axios.get(api(`${endpoint.replace(/\/+$/, '')}/${id}/`));
        if (mounted) setRecord(response.data?.data ?? response.data);
      } catch (error) {
        message.error(error?.response?.data?.message || `Failed to load ${title}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [endpoint, id, title]);

  const fields = useMemo(() => {
    if (!record) return [];

    return Object.entries(record).filter(([key, value]) => {
      if (hiddenKeys.has(key)) return false;
      if (Array.isArray(value)) return false;
      return true;
    });
  }, [record]);

  const childTables = useMemo(() => {
    if (!record) return [];

    return Object.entries(record)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, rows]) => {
        const sample = rows.find(Boolean) || {};
        const columns = Object.keys(sample)
          .filter((columnKey) => !hiddenKeys.has(columnKey) && !Array.isArray(sample[columnKey]))
          .slice(0, 6)
          .map((columnKey) => ({
            title: humanize(columnKey),
            dataIndex: columnKey,
            key: columnKey,
            render: (value) => formatValue(value),
          }));

        return { key, rows, columns };
      });
  }, [record]);

  const recordTitle =
    record?.[titleField] ||
    record?.display_name ||
    record?.voucher_no ||
    record?.transfer_no ||
    record?.code ||
    title;

  return (
    <AuthenticatedLayout>
      <Head title={recordTitle || title} />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href={route(backRoute)}>{backLabel}</Link>
          </Button>

          <Card>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Title level={3} style={{ margin: 0 }}>{recordTitle}</Title>
                {subtitleField && record?.[subtitleField] ? <Text type="secondary">{record[subtitleField]}</Text> : null}
              </Space>
            )}
          </Card>

          {!loading && !record ? <Empty description={`${title} not found`} /> : null}

          {!loading && record ? (
            <>
              <Card title={`${title} Details`}>
                <Descriptions bordered size="small" column={2}>
                  {fields.map(([key, value]) => (
                    <Descriptions.Item key={key} label={humanize(key)} span={isPlainObject(value) ? 2 : 1}>
                      {formatValue(value)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>

              {childTables.map(({ key, rows, columns }) => (
                <Card key={key} title={humanize(key)}>
                  <Table
                    rowKey={(row, index) => row?.id || index}
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                    locale={{ emptyText: <Empty description="No records" /> }}
                  />
                </Card>
              ))}
            </>
          ) : null}
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
