import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
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
  DollarOutlined,
  FundOutlined,
  ReloadOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Paragraph, Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
];

const PAYMENT_STATUS_META = {
  UNPAID: { color: 'orange', icon: <WarningOutlined /> },
  PAID: { color: 'green', icon: <CheckCircleOutlined /> },
  PARTIAL: { color: 'blue', icon: <WalletOutlined /> },
};

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const monthLabel = (month) => MONTH_OPTIONS.find((option) => option.value === Number(month))?.label || '-';

const computeHourlySalary = (salary, monthlyHours) => {
  const totalSalary = asNumber(salary);
  const totalHours = asNumber(monthlyHours);

  if (!totalSalary || !totalHours) return 0;
  return Number((totalSalary / totalHours).toFixed(2));
};

const computeTotalPayable = (salaryPayable, bonus, deduction) => {
  return Number((asNumber(salaryPayable) + asNumber(bonus) - asNumber(deduction)).toFixed(2));
};

function StatusTag({ value }) {
  const meta = PAYMENT_STATUS_META[value] || { color: 'default', icon: null };
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
        <span>{value ? value.charAt(0) + value.slice(1).toLowerCase() : '-'}</span>
      </Space>
    </Tag>
  );
}

function SummaryCard({ title, value, icon, accent, suffix = null, precision = 0 }) {
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
          precision={precision}
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

export default function Payslips({ auth }) {
  const { token } = theme.useToken();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/payslips/'), {
        params: {
          page: 1,
          page_size: 200,
          ordering: '-created_at',
        },
      });

      const rows = data?.results || data?.data || data || [];
      const paidCount = rows.filter((row) => row?.payment_status === 'PAID').length;
      const unpaidCount = rows.filter((row) => row?.payment_status === 'UNPAID').length;
      const partialCount = rows.filter((row) => row?.payment_status === 'PARTIAL').length;
      const totalPayable = rows.reduce((sum, row) => sum + asNumber(row?.total_payable), 0);
      const totalSalary = rows.reduce((sum, row) => sum + asNumber(row?.salary), 0);

      setOverview({
        total: rows.length,
        paidCount,
        unpaidCount,
        partialCount,
        totalPayable: Number(totalPayable.toFixed(2)),
        totalSalary: Number(totalSalary.toFixed(2)),
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
        title: 'Payroll Period',
        key: 'period',
        width: 180,
        render: (_, record) => `${monthLabel(record?.salary_month)} ${record?.salary_year || ''}`.trim(),
      },
      {
        title: 'Salary',
        dataIndex: 'salary',
        key: 'salary',
        align: 'right',
        width: 130,
        render: (value) => <Text strong>{money(value)}</Text>,
      },
      {
        title: 'Salary Payable',
        dataIndex: 'salary_payable',
        key: 'salary_payable',
        align: 'right',
        width: 150,
        render: (value) => <Text strong>{money(value)}</Text>,
      },
      {
        title: 'Bonus',
        dataIndex: 'bonus',
        key: 'bonus',
        align: 'right',
        width: 110,
        render: (value) => money(value),
      },
      {
        title: 'Deduction',
        dataIndex: 'deduction',
        key: 'deduction',
        align: 'right',
        width: 120,
        render: (value) => money(value),
      },
      {
        title: 'Total Payable',
        dataIndex: 'total_payable',
        key: 'total_payable',
        align: 'right',
        width: 150,
        render: (value) => <Text strong style={{ color: '#1677ff' }}>{money(value)}</Text>,
      },
      {
        title: 'Payment Status',
        dataIndex: 'payment_status',
        key: 'payment_status',
        width: 140,
        render: (value) => <StatusTag value={value} />,
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
        name: 'salary_month',
        label: 'Salary Month',
        type: 'select',
        col: 6,
        required: true,
        options: MONTH_OPTIONS,
      },
      {
        name: 'salary_year',
        label: 'Salary Year',
        type: 'number',
        col: 6,
        required: true,
        min: 1900,
      },
      {
        name: 'payment_status',
        label: 'Payment Status',
        type: 'select',
        col: 6,
        options: PAYMENT_STATUS_OPTIONS,
      },
      {
        name: 'salary',
        label: 'Salary',
        type: 'number',
        col: 6,
        required: true,
        min: 0,
      },
      {
        name: 'paid_leave',
        label: 'Paid Leave',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'unpaid_leave',
        label: 'Unpaid Leave',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'monthly_holiday',
        label: 'Monthly Holidays',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'public_holiday',
        label: 'Public Holidays',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'work_day',
        label: 'Work Days',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'shift_wise_work_hour',
        label: 'Shift Work Hours',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'monthly_work_hour',
        label: 'Monthly Work Hours',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'hourly_salary',
        label: 'Hourly Salary',
        type: 'number',
        col: 6,
        min: 0,
        formula: (values) => computeHourlySalary(values?.salary, values?.monthly_work_hour),
      },
      {
        name: 'working_hour',
        label: 'Worked Hours',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'salary_payable',
        label: 'Salary Payable',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'bonus',
        label: 'Bonus',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'deduction',
        label: 'Deduction',
        type: 'number',
        col: 6,
        min: 0,
      },
      {
        name: 'total_payable',
        label: 'Total Payable',
        type: 'number',
        col: 6,
        min: 0,
        formula: (values) => computeTotalPayable(values?.salary_payable, values?.bonus, values?.deduction),
      },
      {
        name: 'bonus_comment',
        label: 'Bonus Comment',
        type: 'textarea',
        col: 12,
        rows: 2,
      },
      {
        name: 'deduction_comment',
        label: 'Deduction Comment',
        type: 'textarea',
        col: 12,
        rows: 2,
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
        name: 'salary_month',
        label: 'Month',
        type: 'select',
        options: MONTH_OPTIONS,
      },
      {
        name: 'salary_year',
        label: 'Year',
        type: 'number',
      },
      {
        name: 'payment_status',
        label: 'Payment Status',
        type: 'select',
        options: PAYMENT_STATUS_OPTIONS,
      },
    ],
    [],
  );

  const validationSchema = Yup.object({
    user_id: Yup.mixed().required('Employee is required'),
    salary_month: Yup.number().required('Salary month is required').min(1).max(12),
    salary_year: Yup.number().required('Salary year is required').min(1900),
    salary: Yup.number().required('Salary is required').min(0),
    paid_leave: Yup.number().required().min(0),
    unpaid_leave: Yup.number().required().min(0),
    monthly_holiday: Yup.number().required().min(0),
    public_holiday: Yup.number().required().min(0),
    work_day: Yup.number().required().min(0),
    shift_wise_work_hour: Yup.number().required().min(0),
    monthly_work_hour: Yup.number().required().min(0),
    hourly_salary: Yup.number().required().min(0),
    working_hour: Yup.number().required().min(0),
    salary_payable: Yup.number().required().min(0),
    bonus: Yup.number().nullable().min(0),
    deduction: Yup.number().nullable().min(0),
    total_payable: Yup.number().required().min(0),
    bonus_comment: Yup.string().nullable().max(255),
    deduction_comment: Yup.string().nullable().max(255),
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const crudInitialValues = {
    user_id: null,
    salary_month: currentMonth,
    salary_year: currentYear,
    salary: 0,
    paid_leave: 0,
    unpaid_leave: 0,
    monthly_holiday: 0,
    public_holiday: 0,
    work_day: 0,
    shift_wise_work_hour: 8,
    monthly_work_hour: 0,
    hourly_salary: 0,
    working_hour: 0,
    salary_payable: 0,
    bonus: 0,
    bonus_comment: '',
    deduction: 0,
    deduction_comment: '',
    total_payable: 0,
    payment_status: 'UNPAID',
    active: true,
  };

  const transformPayload = (values) => {
    const payload = { ...values };

    if (payload.user_id && typeof payload.user_id === 'object') {
      payload.user_id = payload.user_id.id ?? payload.user_id.value;
    }

    [
      'salary_month',
      'salary_year',
      'salary',
      'paid_leave',
      'unpaid_leave',
      'monthly_holiday',
      'public_holiday',
      'work_day',
      'shift_wise_work_hour',
      'monthly_work_hour',
      'hourly_salary',
      'working_hour',
      'salary_payable',
      'bonus',
      'deduction',
      'total_payable',
    ].forEach((key) => {
      payload[key] = asNumber(payload[key]);
    });

    payload.bonus_comment = payload.bonus_comment?.trim() || null;
    payload.deduction_comment = payload.deduction_comment?.trim() || null;
    payload.active = Boolean(payload.active);

    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Payslips" />

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
                'linear-gradient(135deg, rgba(114,46,209,0.10) 0%, rgba(22,119,255,0.07) 50%, #ffffff 100%)',
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
                        background: '#722ed1',
                        color: '#ffffff',
                        fontSize: 20,
                      }}
                    >
                      <DollarOutlined />
                    </span>
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#10233f' }}>
                        Payroll Payslips
                      </Title>
                      <Text type="secondary">
                        Keep salary calculations, payable totals, and payment status clear, structured, and payroll-ready.
                      </Text>
                    </div>
                  </Space>

                  <Paragraph style={{ margin: 0, color: '#44556b', maxWidth: 760 }}>
                    This screen now matches the actual payslip API: payroll month and year, salary, leave and holiday counters, work-hour calculations, salary payable, bonus, deduction, total payable, and payment status. The old fake gross/net structure is gone.
                  </Paragraph>

                  <Space wrap>
                    <Tag color="purple">Payroll accurate</Tag>
                    <Tag color="blue">Hourly rate auto-calculates</Tag>
                    <Tag color="green">Total payable auto-updates</Tag>
                    <Tag color="gold">Payment status driven</Tag>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={9}>
                <Alert
                  type="info"
                  showIcon
                  icon={<WarningOutlined />}
                  message="Payroll note"
                  description="Use Salary Payable for the base payable amount after attendance and leave impact. Bonus and Deduction then adjust the final Total Payable."
                  style={{
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(114,46,209,0.18)',
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
                <SummaryCard title="Payslips" value={overview?.total || 0} accent="#1677ff" icon={<CalendarOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Paid" value={overview?.paidCount || 0} accent="#52c41a" icon={<CheckCircleOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Unpaid" value={overview?.unpaidCount || 0} accent="#faad14" icon={<WarningOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={3}>
                <SummaryCard title="Partial" value={overview?.partialCount || 0} accent="#1677ff" icon={<WalletOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard title="Total Salary" value={overview?.totalSalary || 0} precision={2} accent="#722ed1" icon={<FundOutlined />} />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <SummaryCard title="Total Payable" value={overview?.totalPayable || 0} precision={2} accent="#13c2c2" icon={<DollarOutlined />} />
              </Col>
            </Row>
          )}

          <ReusableCrud
            title="Payslips"
            icon={<DollarOutlined />}
            apiUrl={api('/api/hrm/payslips/')}
            columns={columns}
            fields={fields}
            filters={filters}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformPayload={transformPayload}
            form_ui="drawer"
            drawerWidth={980}
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
              { key: 'unpaid', label: 'Unpaid', params: { payment_status: 'UNPAID' } },
              { key: 'paid', label: 'Paid', params: { payment_status: 'PAID' } },
              { key: 'partial', label: 'Partial', params: { payment_status: 'PARTIAL' } },
              { key: 'all', label: 'All Payslips', params: {} },
            ]}
            defaultAnchorKey="unpaid"
            anchorSyncWithHash
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
