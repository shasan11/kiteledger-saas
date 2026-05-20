import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import QuickAddRemoteSelect from '@/Components/QuickAddRemoteSelect';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const safeTrim = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};

const SALARY_FREQUENCY_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Hourly', value: 'hourly' },
];

const FORM_INITIAL = {
  department_id: null,
  name: '',
  code: '',
  level: '',
  grade: '',
  sort_order: 100,
  default_basic_salary: null,
  salary_frequency: 'monthly',
  default_salary_structure_id: null,
  overtime_eligible: false,
  taxable: true,
  description: '',
  active: true,
};

export default function Designations({ auth, embedded = false }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const searchTimerRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Memoize static params to avoid unnecessary remote reloads
  const departmentParams = useMemo(() => ({ active: true }), []);

  const departmentQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Department Name',
        placeholder: 'e.g. Finance',
        rules: [{ required: true, message: 'Department name is required' }],
      },
      { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ],
    [],
  );

  const createDepartmentPayload = useMemo(
    () => (values) => ({
      name: safeTrim(values.name),
      description: safeTrim(values.description),
      active: values.active !== false,
    }),
    [],
  );

  const fetchRecords = useCallback(
    async (currentPage = page, currentPageSize = pageSize, currentSearch = search) => {
      setPageLoading(true);
      try {
        const response = await axios.get(api('/api/hrm/designations/'), {
          params: {
            page: currentPage,
            page_size: currentPageSize,
            search: currentSearch || undefined,
            ordering: 'sort_order',
          },
        });
        const data = response.data || {};
        setRecords(data.results || data.data || []);
        setTotal(data.count ?? data.total ?? 0);
      } catch {
        message.error('Failed to load designations.');
      } finally {
        setPageLoading(false);
      }
    },
    [page, pageSize, search],
  );

  useEffect(() => {
    void fetchRecords(page, pageSize, search);
  }, [page, pageSize, search]);

  const openAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue(FORM_INITIAL);
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    form.resetFields();
    form.setFieldsValue({
      department_id: record.department_id ?? null,
      name: record.name ?? '',
      code: record.code ?? '',
      level: record.level ?? '',
      grade: record.grade ?? '',
      sort_order: record.sort_order ?? 100,
      default_basic_salary: record.default_basic_salary != null ? Number(record.default_basic_salary) : null,
      salary_frequency: record.salary_frequency ?? 'monthly',
      default_salary_structure_id: record.default_salary_structure_id ?? null,
      overtime_eligible: Boolean(record.overtime_eligible),
      taxable: record.taxable !== false,
      description: record.description ?? '',
      active: record.active !== false,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();

    const payload = {
      department_id: values.department_id || null,
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      level: safeTrim(values.level),
      grade: safeTrim(values.grade),
      sort_order: values.sort_order ?? 100,
      default_basic_salary: values.default_basic_salary != null ? Number(values.default_basic_salary) : null,
      salary_frequency: values.salary_frequency || 'monthly',
      default_salary_structure_id: values.default_salary_structure_id || null,
      overtime_eligible: Boolean(values.overtime_eligible),
      taxable: values.taxable !== false,
      description: safeTrim(values.description),
      active: values.active !== false,
    };

    setSaving(true);
    try {
      if (editingRecord) {
        await axios.patch(api(`/api/hrm/designations/${editingRecord.id}/`), payload);
        message.success('Designation updated.');
      } else {
        await axios.post(api('/api/hrm/designations/'), payload);
        message.success('Designation created.');
      }
      setDrawerOpen(false);
      void fetchRecords(page, pageSize, search);
    } catch (error) {
      const errData = error?.response?.data || {};
      const msg =
        errData.message ||
        Object.values(errData.errors || {})[0]?.[0] ||
        'Failed to save designation.';
      message.error(msg);

      if (errData.errors) {
        const fieldErrors = Object.entries(errData.errors).map(([field, msgs]) => ({
          name: field,
          errors: Array.isArray(msgs) ? msgs : [msgs],
        }));
        form.setFields(fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    setDeletingId(record.id);
    try {
      await axios.delete(api(`/api/hrm/designations/${record.id}/`));
      message.success('Designation deleted.');
      void fetchRecords(page, pageSize, search);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to delete designation.';
      message.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (value) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  const columns = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'sort_order',
        key: 'sort_order',
        width: 60,
        align: 'center',
        render: (v) => <Text type="secondary">{v ?? 100}</Text>,
      },
      {
        title: 'Designation',
        dataIndex: 'name',
        key: 'name',
        render: (name, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{name}</Text>
            {record.code && <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>}
          </Space>
        ),
      },
      {
        title: 'Department',
        key: 'department',
        render: (_, record) => record.department?.name || <Text type="secondary">—</Text>,
      },
      {
        title: 'Level / Grade',
        key: 'level_grade',
        render: (_, record) => {
          const parts = [record.level, record.grade].filter(Boolean);
          return parts.length ? <Text>{parts.join(' / ')}</Text> : <Text type="secondary">—</Text>;
        },
      },
      {
        title: 'Default Salary',
        key: 'default_basic_salary',
        align: 'right',
        render: (_, record) => {
          if (!record.default_basic_salary) return <Text type="secondary">—</Text>;
          return (
            <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
              <Text strong>
                {Number(record.default_basic_salary).toLocaleString('en-NP', {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.salary_frequency ?? 'monthly'}
              </Text>
            </Space>
          );
        },
      },
      {
        title: 'Overtime',
        dataIndex: 'overtime_eligible',
        key: 'overtime_eligible',
        align: 'center',
        width: 90,
        render: (v) =>
          v ? (
            <Tag color="blue" style={{ margin: 0 }}>Yes</Tag>
          ) : (
            <Tag style={{ margin: 0 }}>No</Tag>
          ),
      },
      {
        title: 'Taxable',
        dataIndex: 'taxable',
        key: 'taxable',
        align: 'center',
        width: 80,
        render: (v) =>
          v ? (
            <Tag color="orange" style={{ margin: 0 }}>Yes</Tag>
          ) : (
            <Tag style={{ margin: 0 }}>No</Tag>
          ),
      },
      {
        title: 'Active',
        dataIndex: 'active',
        key: 'active',
        align: 'center',
        width: 70,
        render: (v) =>
          v ? (
            <Tag color="green" style={{ margin: 0 }}>Active</Tag>
          ) : (
            <Tag color="red" style={{ margin: 0 }}>Inactive</Tag>
          ),
      },
      {
        title: '',
        key: 'actions',
        width: 80,
        align: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete this designation?"
              description="This cannot be undone."
              onConfirm={() => handleDelete(record)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletingId === record.id}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletingId],
  );

  const toolbar = (
    <Row
      gutter={[12, 12]}
      align="middle"
      style={{
        marginBottom: token.marginMD,
        padding: `${token.paddingSM}px ${token.paddingMD}px`,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
      }}
    >
      <Col flex="auto">
        <Space size={8}>
          <SolutionOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>Designations</Text>
          <Text type="secondary">({total})</Text>
        </Space>
      </Col>
      <Col>
        <Space size={8}>
          <Input.Search
            allowClear
            placeholder="Search designation, department…"
            style={{ width: 260 }}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={handleSearch}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchRecords(page, pageSize, search)}
            loading={pageLoading}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Designation
          </Button>
        </Space>
      </Col>
    </Row>
  );

  const table = (
    <Table
      rowKey="id"
      dataSource={records}
      columns={columns}
      loading={pageLoading}
      size="small"
      bordered={false}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (t) => `${t} designations`,
        pageSizeOptions: ['10', '20', '50', '100'],
        onChange: (p, ps) => {
          setPage(p);
          setPageSize(ps);
        },
      }}
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
      }}
    />
  );

  const drawer = (
    <Drawer
      title={editingRecord ? `Edit: ${editingRecord.name}` : 'Add Designation'}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      width={640}
      footer={
        <Row justify="end">
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              {editingRecord ? 'Update' : 'Create'}
            </Button>
          </Space>
        </Row>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={FORM_INITIAL}>
        <Row gutter={[12, 0]}>
          {/* Department with quick-add */}
          <Col span={24}>
            <QuickAddRemoteSelect
              name="department_id"
              label="Department"
              apiUrl={api('/api/hrm/departments/')}
              createUrl={api('/api/hrm/departments/')}
              params={departmentParams}
              quickAddTitle="Department"
              quickAddFields={departmentQuickFields}
              quickAddInitialValues={{ active: true }}
              createPayload={createDepartmentPayload}
            />
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="name"
              label="Designation Name"
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input placeholder="e.g. Senior Accountant" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="code" label="Code">
              <Input placeholder="e.g. ACCT-SR" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="level" label="Level">
              <Input placeholder="e.g. Senior / Mid" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="grade" label="Grade">
              <Input placeholder="e.g. G3" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="sort_order" label="Sort Order">
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="default_basic_salary" label="Default Basic Salary">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={(v) => (v ? Number(v).toLocaleString('en-NP') : '')}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="salary_frequency" label="Salary Frequency">
              <Select options={SALARY_FREQUENCY_OPTIONS} />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="overtime_eligible" label="Overtime Eligible" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="taxable" label="Taxable" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Optional notes about this designation" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );

  const content = (
    <>
      {toolbar}
      {table}
      {drawer}
    </>
  );

  if (embedded) return content;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Designations" />
      <div style={{ padding: token.padding, minHeight: 'calc(100vh - 64px)' }}>
        {content}
      </div>
    </AuthenticatedLayout>
  );
}
