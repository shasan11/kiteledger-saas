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
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Paragraph, Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
];

const STATUS_META = {
  PRESENT: { color: 'green', icon: <CheckCircleOutlined /> },
  LATE: { color: 'gold', icon: <ClockCircleOutlined /> },
  HALF_DAY: { color: 'orange', icon: <FieldTimeOutlined /> },
  ABSENT: { color: 'red', icon: <StopOutlined /> },
  ON_LEAVE: { color: 'blue', icon: <TeamOutlined /> },
  HOLIDAY: { color: 'cyan', icon: <CheckSquareOutlined /> },
};

const formatDateTime = (value) => (value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '-');
const formatHours = (value) => (value != null && value !== '' ? `${Number(value).toFixed(2)} hrs` : '-');
const humanize = (value) => {
  if (!value) return '-';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DDTHH:mm') : value;
};

const toPayloadDateTime = (value) => {
  if (!value) return null;
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

const computeHours = (inTime, outTime) => {
  if (!inTime || !outTime) return null;
  const start = dayjs(inTime);
  const end = dayjs(outTime);

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return null;

  const diffHours = end.diff(start, 'minute') / 60;
  return Number(diffHours.toFixed(2));
};

function StatusTag({ value }) {
  const meta = STATUS_META[value] || { color: 'default', icon: null };

  return (
    <Tag
      color={meta.color}
      style={{
        borderRadius: 999,
        paddingInline: 10,
        textTransform: 'capitalize',
      }}
    >
      <Space size={4}>
        {meta.icon}
        <span>{humanize(value)}</span>
      </Space>
    </Tag>
  );
}

function SummaryCard({ title, value, accent, icon, suffix = null }) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 18,
        background: `linear-gradient(135deg, ${accent}14 0%, #ffffff 68%)`,
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
      }}
      styles={{
        body: {
          padding: 18,
        },
      }}
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
          valueStyle={{
            fontSize: 24,
            fontWeight: 700,
            color: '#10233f',
          }}
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
      <Avatar
        size={34}
        style={{
          background: '#1677ff',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
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

export default function Attendance({ auth }) {
  const { token } = theme.useToken();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/attendances/'), {
        params: {
          page: 1,
          page_size: 200,
          ordering: '-in_time',
        },
      });

      const rows = data?.results || data?.data || data || [];
      const today = dayjs().format('YYYY-MM-DD');
      const todayRows = rows.filter((row) => dayjs(row?.in_time).format('YYYY-MM-DD') === today);
      const presentCount = todayRows.filter((row) => row?.in_time_status === 'PRESENT').length;
      const lateCount = todayRows.filter((row) => row?.in_time_status === 'LATE').length;
      const missingCheckoutCount = todayRows.filter((row) => !row?.out_time).length;
      const totalHours = todayRows.reduce((sum, row) => sum + Number(row?.total_hour || 0), 0);
      const avgHours =
        todayRows.length > 0 ? Number((totalHours / todayRows.length).toFixed(2)) : 0;

      setOverview({
        todayRows,
        presentCount,
        lateCount,
        missingCheckoutCount,
        avgHours,
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
      {
        title: 'Employee',
        key: 'employee',
        width: 240,
        render: EmployeeCell,
      },
      {
        title: 'Check In',
        dataIndex: 'in_time',
        key: 'in_time',
        sorter: true,
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'Check Out',
        dataIndex: 'out_time',
        key: 'out_time',
        sorter: true,
        width: 170,
        render: formatDateTime,
      },
      {
        title: 'Arrival Status',
        dataIndex: 'in_time_status',
        key: 'in_time_status',
        width: 150,
        render: (value) => <StatusTag value={value} />,
      },
      {
        title: 'Exit Status',
        dataIndex: 'out_time_status',
        key: 'out_time_status',
        width: 150,
        render: (value) => <StatusTag value={value} />,
      },
      {
        title: 'Total Hours',
        dataIndex: 'total_hour',
        key: 'total_hour',
        sorter: true,
        align: 'right',
        width: 120,
        render: (value) => <Text strong>{formatHours(value)}</Text>,
      },
      {
        title: 'Comment',
        dataIndex: 'comment',
        key: 'comment',
        render: (value) => value || '-',
      },
      {
        title: 'Entry Type',
        dataIndex: 'is_system_generated',
        key: 'is_system_generated',
        width: 120,
        render: (value) => (
          <Tag color={value ? 'purple' : 'default'}>{value ? 'System' : 'Manual'}</Tag>
        ),
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
        name: 'in_time',
        label: 'Check In',
        type: 'custom',
        col: 12,
        required: true,
        render: ({ value, setFieldValue }) => (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(event) => setFieldValue('in_time', event.target.value)}
          />
        ),
      },
      {
        name: 'out_time',
        label: 'Check Out',
        type: 'custom',
        col: 12,
        render: ({ value, setFieldValue }) => (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(event) => setFieldValue('out_time', event.target.value)}
          />
        ),
      },
      {
        name: 'in_time_status',
        label: 'Arrival Status',
        type: 'select',
        col: 6,
        options: ATTENDANCE_STATUS_OPTIONS,
      },
      {
        name: 'out_time_status',
        label: 'Exit Status',
        type: 'select',
        col: 6,
        options: ATTENDANCE_STATUS_OPTIONS,
      },
      {
        name: 'total_hour',
        label: 'Total Hours',
        type: 'number',
        col: 6,
        min: 0,
        formula: (values) => computeHours(values?.in_time, values?.out_time),
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 6,
      },
      {
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        col: 24,
        rows: 3,
        placeholder: 'Add a note such as late arrival reason, manual correction, or field visit.',
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
        name: 'in_time_status',
        label: 'Arrival Status',
        type: 'select',
        options: ATTENDANCE_STATUS_OPTIONS,
      },
    ],
    [],
  );

  const validationSchema = Yup.object({
    user_id: Yup.mixed().required('Employee is required'),
    in_time: Yup.string().required('Check in is required'),
    out_time: Yup.string()
      .nullable()
      .test('after-in-time', 'Check out must be after check in', function (value) {
        if (!value || !this.parent?.in_time) return true;
        return dayjs(value).isSame(dayjs(this.parent.in_time)) || dayjs(value).isAfter(dayjs(this.parent.in_time));
      }),
    in_time_status: Yup.string().nullable(),
    out_time_status: Yup.string().nullable(),
    total_hour: Yup.number().nullable().min(0),
    comment: Yup.string().nullable().max(255),
  });

  const crudInitialValues = {
    user_id: null,
    in_time: dayjs().hour(9).minute(0).format('YYYY-MM-DDTHH:mm'),
    out_time: dayjs().hour(18).minute(0).format('YYYY-MM-DDTHH:mm'),
    in_time_status: 'PRESENT',
    out_time_status: 'PRESENT',
    total_hour: 9,
    comment: '',
    active: true,
  };

  const transformRecord = (record) => ({
    ...record,
    in_time: toDateTimeLocal(record?.in_time),
    out_time: toDateTimeLocal(record?.out_time),
  });

  const transformPayload = (values) => {
    const payload = { ...values };

    if (payload.user_id && typeof payload.user_id === 'object') {
      payload.user_id = payload.user_id.id ?? payload.user_id.value;
    }

    payload.in_time = toPayloadDateTime(payload.in_time);
    payload.out_time = toPayloadDateTime(payload.out_time);
    payload.total_hour =
      payload.total_hour === '' || payload.total_hour == null ? computeHours(values.in_time, values.out_time) : Number(payload.total_hour);
    payload.active = Boolean(payload.active);
    payload.comment = payload.comment?.trim() || null;

    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));

    return payload;
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Attendance" />

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
                'linear-gradient(135deg, rgba(22,119,255,0.10) 0%, rgba(82,196,26,0.08) 50%, #ffffff 100%)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
            styles={{
              body: {
                padding: 24,
              },
            }}
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
                        background: '#1677ff',
                        color: '#ffffff',
                        fontSize: 20,
                      }}
                    >
                      <CheckSquareOutlined />
                    </span>
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#10233f' }}>
                        Attendance Register
                      </Title>
                      <Text type="secondary">
                        Track punch in, punch out, attendance quality, and working hours in one clean place.
                      </Text>
                    </div>
                  </Space>

                  <Paragraph
                    style={{
                      margin: 0,
                      color: '#44556b',
                      maxWidth: 760,
                    }}
                  >
                    This page now maps directly to the real attendance model: employee, check-in time, check-out time, arrival status, exit status, total hours, and comments. Use it for accurate daily attendance entries and manual corrections.
                  </Paragraph>

                  <Space wrap>
                    <Tag color="blue">Branch scoped</Tag>
                    <Tag color="green">Hours auto-calculate</Tag>
                    <Tag color="gold">Late arrivals highlighted</Tag>
                    <Tag color="purple">System vs manual entries visible</Tag>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={9}>
                <Alert
                  type="info"
                  showIcon
                  icon={<WarningOutlined />}
                  message="Meaningful entry tip"
                  description="Use Arrival Status for the day outcome like Present or Late. Use Exit Status only when the end-of-day record needs a separate outcome."
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(22,119,255,0.12)',
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
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard
                  title="Today's Entries"
                  value={overview?.todayRows?.length || 0}
                  accent="#1677ff"
                  icon={<TeamOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard
                  title="Present Today"
                  value={overview?.presentCount || 0}
                  accent="#52c41a"
                  icon={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard
                  title="Late Arrivals"
                  value={overview?.lateCount || 0}
                  accent="#faad14"
                  icon={<ClockCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard
                  title="Avg Hours Today"
                  value={overview?.avgHours || 0}
                  suffix="hrs"
                  accent="#722ed1"
                  icon={<FieldTimeOutlined />}
                />
              </Col>
            </Row>
          )}

          {!overviewLoading && (overview?.missingCheckoutCount || 0) > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${overview.missingCheckoutCount} attendance entr${overview.missingCheckoutCount === 1 ? 'y is' : 'ies are'} missing check-out for today.`}
              description="Review those records to keep payroll and work-hour totals accurate."
              style={{ borderRadius: 16 }}
            />
          )}

          <ReusableCrud
            title="Attendance"
            icon={<CheckSquareOutlined />}
            apiUrl={api('/api/hrm/attendances/')}
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
            defaultSortField="in_time"
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
              { key: 'all', label: 'All Entries', params: {} },
              { key: 'present', label: 'Present', params: { in_time_status: 'PRESENT' } },
              { key: 'late', label: 'Late', params: { in_time_status: 'LATE' } },
              { key: 'absent', label: 'Absent', params: { in_time_status: 'ABSENT' } },
              { key: 'on-leave', label: 'On Leave', params: { in_time_status: 'ON_LEAVE' } },
            ]}
            defaultAnchorKey="all"
            anchorSyncWithHash
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
