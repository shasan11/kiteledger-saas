import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FormOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Paragraph, Text, Title } = Typography;

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
        background: `linear-gradient(135deg, ${accent}14 0%, #ffffff 68%)`,
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
  const { token } = theme.useToken();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

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

  useEffect(() => {
    loadOverview();
  }, []);

  const columns = useMemo(
    () => [
      { title: 'Employee', key: 'employee', width: 240, render: EmployeeCell },
      {
        title: 'Leave Type',
        dataIndex: 'leave_type',
        key: 'leave_type',
        width: 170,
        render: (value) => value || '-',
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
        name: 'leave_type',
        label: 'Leave Type',
        type: 'text',
        col: 12,
        required: true,
        placeholder: 'e.g. Annual Leave, Sick Leave, Casual Leave',
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
        name: 'leave_type',
        label: 'Leave Type',
        type: 'text',
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
    leave_type: Yup.string().required('Leave type is required').max(60),
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

    payload.leave_from = toDate(payload.leave_from);
    payload.leave_to = toDate(payload.leave_to);
    payload.accept_leave_from = toDate(payload.accept_leave_from);
    payload.accept_leave_to = toDate(payload.accept_leave_to);
    payload.leave_duration =
      payload.leave_duration === '' || payload.leave_duration == null
        ? computeLeaveDuration(values.leave_from, values.leave_to)
        : Number(payload.leave_duration);
    payload.leave_type = payload.leave_type?.trim() || null;
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
          background: token.colorBgLayout,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, rgba(250,173,20,0.10) 0%, rgba(22,119,255,0.06) 55%, #ffffff 100%)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} lg={15}>
                <Space direction="vertical" size={8} style={{ display: 'flex' }}>
                  <Space size={12}>
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#faad14',
                        color: '#ffffff',
                        fontSize: 20,
                      }}
                    >
                      <FormOutlined />
                    </span>
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#10233f' }}>
                        Leave Applications
                      </Title>
                      <Text type="secondary">
                        Manage request flow, future absences, approvals, and review comments in one tidy workspace.
                      </Text>
                    </div>
                  </Space>

                  <Paragraph style={{ margin: 0, color: '#44556b', maxWidth: 760 }}>
                    This page now follows the real leave API shape: employee, leave type, leave dates, approved dates, duration, status, reason, review comment, and attachment reference. The UI is cleaner, and the form now reflects what your backend actually stores.
                  </Paragraph>

                  <Space wrap>
                    <Tag color="gold">Approval workflow ready</Tag>
                    <Tag color="blue">Duration auto-calculates</Tag>
                    <Tag color="green">Status-driven view</Tag>
                    <Tag color="purple">Future leave visibility</Tag>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={9}>
                <Alert
                  type="info"
                  showIcon
                  icon={<WarningOutlined />}
                  message="Meaningful request tip"
                  description="Use Leave Type as the actual leave category label the HR team recognizes. Approved dates can stay empty until the request is reviewed."
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(250,173,20,0.18)',
                  }}
                  action={
                    <Button icon={<ReloadOutlined />} onClick={loadOverview}>
                      Refresh
                    </Button>
                  }
                />
              </Col>
            </Row>
          </Card>

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
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
