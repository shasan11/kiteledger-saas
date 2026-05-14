import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  FormOutlined,
  StopOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_META = {
  PENDING: { color: 'gold', icon: <ClockCircleOutlined /> },
  APPROVED: { color: 'green', icon: <CheckCircleOutlined /> },
  REJECTED: { color: 'red', icon: <StopOutlined /> },
  CANCELLED: { color: 'volcano', icon: <WarningOutlined /> },
};

const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');
const toDate = (value) => {
  if (!value) return null;
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD') : value;
};

const humanize = (value) => {
  if (!value) return '-';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const computeLeaveDuration = (from, to) => {
  if (!from || !to) return null;
  const start = dayjs(from);
  const end = dayjs(to);

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return null;
  return end.diff(start, 'day') + 1;
};

function StatusTag({ value }) {
  const meta = STATUS_META[value] || { color: 'default', icon: null };
  return (
    <Tag
      color={meta.color}
      style={{
        borderRadius: 999,
        paddingInline: 10,
      }}
    >
      <Space size={4}>
        {meta.icon}
        <span>{humanize(value)}</span>
      </Space>
    </Tag>
  );
}

function SummaryCard({ title, value, icon, accent, suffix = null }) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 18,
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Space align="start" size={14}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}18`,
            color: accent,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <Statistic
          title={title}
          value={value}
          suffix={suffix}
          valueStyle={{ fontSize: 24, fontWeight: 700, color: '#10233f' }}
        />
      </Space>
    </Card>
  );
}

function EmployeeCell(_, record) {
  const user = record?.user;
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email
    : '-';
  const initials = user
    ? [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'
    : 'U';

  return (
    <Space size={10}>
      <Avatar size={34} style={{ background: '#1677ff', fontWeight: 700, fontSize: 12 }}>
        {initials}
      </Avatar>
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ display: 'block' }}>
          {fullName}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {user?.employee_id || user?.username || user?.email || 'Employee'}
        </Text>
      </div>
    </Space>
  );
}

export default function LeaveApplications({ auth }) {
  const { message } = App.useApp();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [typeForm] = Form.useForm();
  const [policyForm] = Form.useForm();

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/leave-applications/'), {
        params: {
          page: 1,
          page_size: 200,
          ordering: '-created_at',
        },
      });

      const rows = data?.results || data?.data || data || [];
      const pending = rows.filter((row) => row?.status === 'PENDING').length;
      const approved = rows.filter((row) => row?.status === 'APPROVED').length;
      const rejected = rows.filter((row) => row?.status === 'REJECTED').length;
      const futureRows = rows.filter((row) => row?.leave_from && dayjs(row.leave_from).isAfter(dayjs(), 'day'));
      const upcomingDays = futureRows.reduce((sum, row) => sum + Number(row?.leave_duration || 0), 0);

      setOverview({
        total: rows.length,
        pending,
        approved,
        rejected,
        upcomingDays,
      });
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadLeaveLookups = async () => {
    const [typesRes, policiesRes] = await Promise.all([
      axios.get(api('/api/hrm/leave-types/'), { params: { page_size: 200, active: true } }),
      axios.get(api('/api/hrm/leave-policies/'), { params: { page_size: 200, active: true } }),
    ]);

    setLeaveTypes(typesRes.data?.results || typesRes.data?.data || []);
    setLeavePolicies(policiesRes.data?.results || policiesRes.data?.data || []);
  };

  useEffect(() => {
    loadOverview();
    loadLeaveLookups().catch(() => {});
  }, []);

  const saveLeaveType = async () => {
    const values = await typeForm.validateFields();
    setSavingType(true);
    try {
      await axios.post(api('/api/hrm/leave-types/'), {
        ...values,
        code: values.code?.trim() || null,
        max_days_per_year: values.max_days_per_year ?? null,
        requires_approval: Boolean(values.requires_approval),
        is_paid: Boolean(values.is_paid),
        active: true,
      });
      message.success('Leave type added.');
      setTypeModalOpen(false);
      typeForm.resetFields();
      await loadLeaveLookups();
    } finally {
      setSavingType(false);
    }
  };

  const saveLeavePolicy = async () => {
    const values = await policyForm.validateFields();
    setSavingPolicy(true);
    try {
      await axios.post(api('/api/hrm/leave-policies/'), {
        ...values,
        description: values.description?.trim() || null,
        active: true,
      });
      message.success('Leave policy added.');
      setPolicyModalOpen(false);
      policyForm.resetFields();
      await loadLeaveLookups();
    } finally {
      setSavingPolicy(false);
    }
  };

  const columns = useMemo(
    () => [
      { title: 'Employee', key: 'employee', width: 240, render: EmployeeCell },
      {
        title: 'Policy',
        key: 'leave_policy',
        width: 160,
        render: (_, row) => row?.leave_policy?.name || row?.leavePolicy?.name || '-',
      },
      {
        title: 'Leave Type',
        key: 'leave_type',
        width: 170,
        render: (_, row) => row?.leave_type_record?.name || row?.leaveTypeRecord?.name || row?.leave_type || '-',
      },
      {
        title: 'From',
        dataIndex: 'leave_from',
        key: 'leave_from',
        sorter: true,
        width: 130,
        render: formatDate,
      },
      {
        title: 'To',
        dataIndex: 'leave_to',
        key: 'leave_to',
        sorter: true,
        width: 130,
        render: formatDate,
      },
      {
        title: 'Days',
        dataIndex: 'leave_duration',
        key: 'leave_duration',
        align: 'right',
        width: 90,
        render: (value) => <Text strong>{value ?? '-'}</Text>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (value) => <StatusTag value={value} />,
      },
      {
        title: 'Reason',
        dataIndex: 'reason',
        key: 'reason',
        render: (value) => value || '-',
      },
      {
        title: 'Review Comment',
        dataIndex: 'review_comment',
        key: 'review_comment',
        render: (value) => value || '-',
      },
    ],
    [],
  );

  const fields = useMemo(
    () => [
      {
        name: 'user_id',
        label: 'Employee',
        type: 'fkSelect',
        col: 12,
        required: true,
        fkUrl: api('/api/hrm/users/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'first_name',
        fkLabel: (row) =>
          row ? [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username : '',
      },
      {
        name: 'leave_policy_id',
        label: 'Leave Policy',
        type: 'fkSelect',
        col: 12,
        fkUrl: api('/api/hrm/leave-policies/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => row?.name || '',
      },
      {
        name: 'leave_type_id',
        label: 'Leave Type',
        type: 'fkSelect',
        col: 12,
        required: true,
        fkUrl: api('/api/hrm/leave-types/'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => row ? `${row.name}${row.code ? ` (${row.code})` : ''}` : '',
      },
      {
        name: 'leave_from',
        label: 'From Date',
        type: 'date',
        col: 8,
        required: true,
      },
      {
        name: 'leave_to',
        label: 'To Date',
        type: 'date',
        col: 8,
        required: true,
      },
      {
        name: 'leave_duration',
        label: 'Leave Duration',
        type: 'number',
        col: 8,
        min: 0,
        formula: (values) => computeLeaveDuration(values?.leave_from, values?.leave_to),
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        col: 8,
        options: STATUS_OPTIONS,
      },
      {
        name: 'accept_leave_from',
        label: 'Approved From',
        type: 'date',
        col: 8,
      },
      {
        name: 'accept_leave_to',
        label: 'Approved To',
        type: 'date',
        col: 8,
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea',
        col: 24,
        rows: 3,
        placeholder: 'Explain the reason for this leave request.',
      },
      {
        name: 'review_comment',
        label: 'Review Comment',
        type: 'textarea',
        col: 24,
        rows: 2,
        placeholder: 'Optional manager or HR review note.',
      },
      {
        name: 'attachment',
        label: 'Attachment Path',
        type: 'text',
        col: 24,
        placeholder: 'Optional attachment reference or uploaded file path',
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
    ],
    [],
  );

  const filters = useMemo(
    () => [
      {
        name: 'user_id',
        label: 'Employee',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/users'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'first_name',
        fkLabel: (row) =>
          row ? [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username : '',
      },
      {
        name: 'leave_policy_id',
        label: 'Leave Policy',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/leave-policies'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => row?.name || '',
      },
      {
        name: 'leave_type_id',
        label: 'Leave Type',
        type: 'fkSelect',
        fkUrl: api('/api/hrm/leave-types'),
        fkSearchParam: 'search',
        fkPageSize: 20,
        fkValueKey: 'id',
        fkLabelKey: 'name',
        fkLabel: (row) => row ? `${row.name}${row.code ? ` (${row.code})` : ''}` : '',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS,
      },
    ],
    [],
  );

  const validationSchema = Yup.object({
    user_id: Yup.mixed().required('Employee is required'),
    leave_type_id: Yup.mixed().required('Leave type is required'),
    leave_policy_id: Yup.mixed().nullable(),
    leave_from: Yup.string().required('From date is required'),
    leave_to: Yup.string()
      .required('To date is required')
      .test('after-from', 'To date must be on or after from date', function (value) {
        if (!value || !this.parent?.leave_from) return true;
        return dayjs(value).isSame(dayjs(this.parent.leave_from), 'day') || dayjs(value).isAfter(dayjs(this.parent.leave_from), 'day');
      }),
    leave_duration: Yup.number().nullable().min(0),
    status: Yup.string().nullable(),
    reason: Yup.string().nullable().max(255),
    review_comment: Yup.string().nullable().max(255),
    attachment: Yup.string().nullable().max(255),
  });

  const crudInitialValues = {
    user_id: null,
    leave_policy_id: null,
    leave_type_id: null,
    leave_type: '',
    leave_from: dayjs().format('YYYY-MM-DD'),
    leave_to: dayjs().format('YYYY-MM-DD'),
    leave_duration: 1,
    status: 'PENDING',
    accept_leave_from: '',
    accept_leave_to: '',
    reason: '',
    review_comment: '',
    attachment: '',
    active: true,
  };

  const transformRecord = (record) => ({
    ...record,
    leave_policy_id: record?.leave_policy_id || record?.leave_policy?.id || record?.leavePolicy?.id || null,
    leave_type_id: record?.leave_type_id || record?.leave_type_record?.id || record?.leaveTypeRecord?.id || null,
    leave_from: toDate(record?.leave_from),
    leave_to: toDate(record?.leave_to),
    accept_leave_from: toDate(record?.accept_leave_from),
    accept_leave_to: toDate(record?.accept_leave_to),
  });

  const transformPayload = (values) => {
    const payload = { ...values };

    if (payload.user_id && typeof payload.user_id === 'object') {
      payload.user_id = payload.user_id.id ?? payload.user_id.value;
    }
    if (payload.leave_policy_id && typeof payload.leave_policy_id === 'object') {
      payload.leave_policy_id = payload.leave_policy_id.id ?? payload.leave_policy_id.value;
    }
    const selectedTypeValue = payload.leave_type_id;
    const selectedTypeName = typeof selectedTypeValue === 'object'
      ? selectedTypeValue.name || selectedTypeValue.label
      : null;

    if (payload.leave_type_id && typeof payload.leave_type_id === 'object') {
      payload.leave_type_id = payload.leave_type_id.id ?? payload.leave_type_id.value;
    }

    payload.leave_from = toDate(payload.leave_from);
    payload.leave_to = toDate(payload.leave_to);
    payload.accept_leave_from = toDate(payload.accept_leave_from);
    payload.accept_leave_to = toDate(payload.accept_leave_to);
    payload.leave_duration =
      payload.leave_duration === '' || payload.leave_duration == null
        ? computeLeaveDuration(values.leave_from, values.leave_to)
        : Number(payload.leave_duration);
    const selectedType = leaveTypes.find((type) => type.id === payload.leave_type_id);
    payload.leave_type = selectedType?.name || selectedTypeName || payload.leave_type?.trim() || 'Leave';
    payload.reason = payload.reason?.trim() || null;
    payload.review_comment = payload.review_comment?.trim() || null;
    payload.attachment = payload.attachment?.trim() || null;
    payload.active = Boolean(payload.active);

    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Applications" />

      <div
        style={{
          padding: 16,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          {overviewLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Total Requests" value={overview?.total || 0} accent="#1677ff" icon={<TeamOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Pending" value={overview?.pending || 0} accent="#faad14" icon={<ClockCircleOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Approved" value={overview?.approved || 0} accent="#52c41a" icon={<CheckCircleOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Rejected" value={overview?.rejected || 0} accent="#ff4d4f" icon={<StopOutlined />} />
              </Col>
              <Col xs={24} sm={24} xl={12}>
                <SummaryCard title="Upcoming Leave Days" value={overview?.upcomingDays || 0} suffix="days" accent="#722ed1" icon={<CalendarOutlined />} />
              </Col>
            </Row>
          )}

          <Card bordered={false} style={{ borderRadius: 14 }} styles={{ body: { padding: 14 } }}>
            <Row gutter={[12, 10]} align="middle">
              <Col flex="auto">
                <Space size={14} wrap>
                  <Text strong>Leave setup</Text>
                  <Text type="secondary">{leavePolicies.length} policies</Text>
                  <Text type="secondary">{leaveTypes.length} types</Text>
                </Space>
              </Col>
              <Col>
                <Space wrap>
                  <Button icon={<PlusOutlined />} onClick={() => setPolicyModalOpen(true)}>
                    Quick Add Policy
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setTypeModalOpen(true)}>
                    Quick Add Type
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <ReusableCrud
            title="Leave Applications"
            icon={<FormOutlined />}
            apiUrl={api('/api/hrm/leave-applications/')}
            columns={columns}
            fields={fields}
            filters={filters}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformRecord={transformRecord}
            transformPayload={transformPayload}
            form_ui="drawer"
            drawerWidth={860}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            defaultSortField="created_at"
            defaultSortOrder="descend"
            enableServerPagination={true}
            showSearch={true}
            canAdd={true}
            canEdit={true}
            canDelete={true}
            hasActions={true}
            hasActionColumns={true}
            activeParam="active"
            enableInactiveDrawer={true}
            anchorFilters={[
              { key: 'pending', label: 'Pending', params: { status: 'PENDING' } },
              { key: 'approved', label: 'Approved', params: { status: 'APPROVED' } },
              { key: 'rejected', label: 'Rejected', params: { status: 'REJECTED' } },
              { key: 'all', label: 'All Requests', params: {} },
            ]}
            defaultAnchorKey="pending"
            anchorSyncWithHash
          />

          <Modal
            title="Quick Add Leave Policy"
            open={policyModalOpen}
            onCancel={() => setPolicyModalOpen(false)}
            onOk={saveLeavePolicy}
            confirmLoading={savingPolicy}
            destroyOnClose
          >
            <Form
              form={policyForm}
              layout="vertical"
              initialValues={{ paid_leave_count: 0, unpaid_leave_count: 0 }}
            >
              <Form.Item name="name" label="Policy Name" rules={[{ required: true, message: 'Policy name is required' }]}>
                <Input placeholder="Annual leave policy" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="paid_leave_count" label="Paid Days" rules={[{ required: true, message: 'Paid days are required' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unpaid_leave_count" label="Unpaid Days" rules={[{ required: true, message: 'Unpaid days are required' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} placeholder="Optional notes for HR" />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Quick Add Leave Type"
            open={typeModalOpen}
            onCancel={() => setTypeModalOpen(false)}
            onOk={saveLeaveType}
            confirmLoading={savingType}
            destroyOnClose
          >
            <Form
              form={typeForm}
              layout="vertical"
              initialValues={{ requires_approval: true, is_paid: true }}
            >
              <Form.Item name="name" label="Type Name" rules={[{ required: true, message: 'Leave type is required' }]}>
                <Input placeholder="Sick Leave" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="code" label="Code">
                    <Input placeholder="SL" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="max_days_per_year" label="Max Days / Year">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="requires_approval" label="Requires Approval" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="is_paid" label="Paid Leave" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
