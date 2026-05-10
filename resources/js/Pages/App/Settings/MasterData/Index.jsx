import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
  message,
  theme,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const MASTER_DATA_TYPES = [
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'payment_mode', label: 'Payment Mode' },
  { value: 'cost_term', label: 'Cost Term' },
  { value: 'task_type', label: 'Task Type' },
  { value: 'activity_type', label: 'Activity Type' },
  { value: 'custom_status', label: 'Status' },
  { value: 'deal_stage', label: 'Deal Stage' },
  { value: 'tds_type', label: 'TDS Type' },
  { value: 'industry', label: 'Industry' },
  { value: 'lost_reason', label: 'Lost Reason' },
];

const NEW_ROW_ID = '__new__';

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const emptyEditValues = {
  value: '',
  meta: '',
  active: true,
};

export default function MasterData() {
  const { token } = theme.useToken();

  const [activeType, setActiveType] = useState('lead_source');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState(emptyEditValues);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const activeTypeLabel = useMemo(() => {
    return (
      MASTER_DATA_TYPES.find((item) => item.value === activeType)?.label ||
      'Master Data'
    );
  }, [activeType]);

  const tableData = useMemo(() => {
    if (editingId === NEW_ROW_ID) {
      return [
        {
          id: NEW_ROW_ID,
          value: editValues.value,
          meta: editValues.meta,
          active: editValues.active,
          isNew: true,
        },
        ...rows,
      ];
    }

    return rows;
  }, [editingId, editValues, rows]);

  const fetchRows = async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(true);

    try {
      const params = {
        page,
        page_size: pageSize,
        ordering: 'value',
        type: activeType,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await axios.get(api('/api/master-data/'), { params });
      const payload = response.data || {};

      setRows(Array.isArray(payload.results) ? payload.results : []);

      setPagination({
        current: page,
        pageSize,
        total: payload.count || 0,
      });
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEditingId(null);
    setEditValues(emptyEditValues);
    fetchRows(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const startAdd = () => {
    if (editingId) {
      message.warning('Save or cancel the current row first');
      return;
    }

    setEditingId(NEW_ROW_ID);
    setEditValues(emptyEditValues);
  };

  const startEdit = (record) => {
    if (editingId) {
      message.warning('Save or cancel the current row first');
      return;
    }

    setEditingId(record.id);
    setEditValues({
      value: record.value || '',
      meta: record.meta || '',
      active: record.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(emptyEditValues);
  };

  const updateEditValue = (field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildPayload = (record = null) => {
    const name = editValues.value?.trim() || '';

    return {
      type: activeType,
      group: activeType,
      key: record?.key || slugify(name),
      value: name,
      meta: editValues.meta?.trim() || null,
      active: editValues.active !== false,
    };
  };

  const saveRow = async (record) => {
    const name = editValues.value?.trim();

    if (!name) {
      message.error('Name is required');
      return;
    }

    setSavingId(record.id);

    try {
      const payload = buildPayload(record.id === NEW_ROW_ID ? null : record);

      if (record.id === NEW_ROW_ID) {
        await axios.post(api('/api/master-data/'), payload);
        message.success('Added');
      } else {
        await axios.put(api(`/api/master-data/${record.id}`), payload);
        message.success('Updated');
      }

      cancelEdit();
      fetchRows(pagination.current, pagination.pageSize);
    } catch (error) {
      const apiErrors = error?.response?.data;

      if (apiErrors && typeof apiErrors === 'object') {
        const firstKey = Object.keys(apiErrors)[0];
        const firstMessage = Array.isArray(apiErrors[firstKey])
          ? apiErrors[firstKey][0]
          : apiErrors[firstKey];

        message.error(firstMessage || 'Failed to save');
        return;
      }

      message.error('Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (record) => {
    try {
      await axios.delete(api(`/api/master-data/${record.id}`));
      message.success('Deleted');

      const nextPage =
        rows.length === 1 && pagination.current > 1
          ? pagination.current - 1
          : pagination.current;

      fetchRows(nextPage, pagination.pageSize);
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Failed to delete'
      );
    }
  };

  const isEditing = (record) => record.id === editingId;

  const columns = [
    {
      title: activeTypeLabel,
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => {
        if (isEditing(record)) {
          return (
            <Input
              autoFocus={record.id === NEW_ROW_ID}
              value={editValues.value}
              placeholder="Enter name"
              onChange={(event) => updateEditValue('value', event.target.value)}
              onPressEnter={() => saveRow(record)}
            />
          );
        }

        return <Text strong>{value || '-'}</Text>;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'meta',
      key: 'meta',
      render: (value, record) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editValues.meta}
              placeholder="Optional"
              onChange={(event) => updateEditValue('meta', event.target.value)}
              onPressEnter={() => saveRow(record)}
            />
          );
        }

        return value ? (
          <Text type="secondary">{value}</Text>
        ) : (
          <Text type="secondary">-</Text>
        );
      },
    },
     
    {
      title: '',
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_, record) => {
        if (isEditing(record)) {
          return (
            <Space size={4}>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={savingId === record.id}
                onClick={() => saveRow(record)}
              />

              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={cancelEdit}
              />
            </Space>
          );
        }

        return (
          <Space size={4}>
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => startEdit(record)}
            />

            <Popconfirm
              title="Delete this item?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteRow(record)}
            >
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Head title="Master Data" />

      <div
        style={{
          minHeight: '100vh',
          padding: 18,
          background: token.colorBgLayout,
        }}
      >
        <Card
          style={{
            borderRadius: token.borderRadiusLG,
            borderColor: token.colorBorderSecondary,
            boxShadow: token.boxShadowTertiary,
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Row gutter={[12, 12]} align="middle" justify="space-between">
            <Col xs={24} md={10}>
              <Title level={4} style={{ margin: 0 }}>
                Master Data
              </Title>
              
            </Col>

            <Col xs={24} md={14}>
              <Space
                style={{
                  width: '100%',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onPressEnter={() => fetchRows(1, pagination.pageSize)}
                  style={{ width: 220 }}
                />

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchRows(1, pagination.pageSize)}
                />

                <Button type="primary" icon={<PlusOutlined />} onClick={startAdd}>
                  Add
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Card
          style={{
            marginTop: 14,
            borderRadius: token.borderRadiusLG,
            borderColor: token.colorBorderSecondary,
            boxShadow: token.boxShadowTertiary,
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              padding: '8px 16px 0',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Tabs
              activeKey={activeType}
              onChange={(key) => {
                setSearch('');
                setRows([]);
                setActiveType(key);
              }}
              items={MASTER_DATA_TYPES.map((item) => ({
                key: item.value,
                label: item.label,
              }))}
            />
          </div>

          <div style={{ padding: 16 }}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={tableData}
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `${total} records`,
                onChange: (page, pageSize) => fetchRows(page, pageSize),
              }}
              locale={{
                emptyText: (
                  <Empty description={`No ${activeTypeLabel} yet`}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={startAdd}>
                      Add
                    </Button>
                  </Empty>
                ),
              }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}