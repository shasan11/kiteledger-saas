import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const PAY_STATUS_COLORS = { UNPAID: 'red', PARTIAL: 'orange', PAID: 'green' };
const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payslips(props) {
  const columns = [
    {
      title: 'Employee', key: 'user', width: 180,
      render: (_, r) => {
        const u = r.user;
        return u ? <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</strong> : '-';
      },
    },
    {
      title: 'Period', key: 'period', sorter: false, width: 110,
      render: (_, r) => <Tag color="geekblue">{MONTHS[(r.salary_month || 1) - 1]} {r.salary_year}</Tag>,
    },
    { title: 'Salary', dataIndex: 'salary', key: 'salary', sorter: true, width: 110, render: fmtMoney },
    { title: 'Work Days', dataIndex: 'work_day', key: 'work_day', sorter: true, width: 90, render: (v) => v ?? '-' },
    { title: 'Work Hours', dataIndex: 'working_hour', key: 'working_hour', sorter: true, width: 100, render: (v) => v != null ? `${Number(v).toFixed(1)}h` : '-' },
    { title: 'Payable', dataIndex: 'salary_payable', key: 'salary_payable', sorter: true, width: 110, render: fmtMoney },
    { title: 'Bonus', dataIndex: 'bonus', key: 'bonus', width: 90, render: (v) => v ? <span style={{ color: 'green' }}>+{fmtMoney(v)}</span> : '-' },
    { title: 'Deduction', dataIndex: 'deduction', key: 'deduction', width: 100, render: (v) => v ? <span style={{ color: '#d4380d' }}>-{fmtMoney(v)}</span> : '-' },
    { title: 'Total Payable', dataIndex: 'total_payable', key: 'total_payable', sorter: true, width: 120, render: (v) => <strong>{fmtMoney(v)}</strong> },
    {
      title: 'Payment', dataIndex: 'payment_status', key: 'payment_status', sorter: true, width: 100,
      render: (v) => <Tag color={PAY_STATUS_COLORS[v] || 'default'}>{v || '—'}</Tag>,
    },
  ];

  const fields = [
    // Section A: Period
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '' },
    { name: 'salary_month', label: 'Salary Month', type: 'select', required: true, col: 8,
      options: MONTHS.map((m, i) => ({ label: m, value: i + 1 })) },
    { name: 'salary_year', label: 'Salary Year', type: 'number', required: true, col: 8, min: 2000, max: 2100 },
    // Section B: Salary Base
    { name: 'salary', label: 'Base Salary', type: 'number', required: true, col: 8, min: 0 },
    { name: 'paid_leave', label: 'Paid Leave Days', type: 'number', required: true, col: 6, min: 0 },
    { name: 'unpaid_leave', label: 'Unpaid Leave Days', type: 'number', required: true, col: 6, min: 0 },
    { name: 'monthly_holiday', label: 'Monthly Holidays', type: 'number', required: true, col: 6, min: 0 },
    { name: 'public_holiday', label: 'Public Holidays', type: 'number', required: true, col: 6, min: 0 },
    { name: 'work_day', label: 'Work Days', type: 'number', required: true, col: 8, min: 0 },
    // Section C: Work Hour
    { name: 'shift_wise_work_hour', label: 'Shift-wise Work Hours', type: 'number', required: true, col: 8, min: 0 },
    { name: 'monthly_work_hour', label: 'Monthly Work Hours', type: 'number', required: true, col: 8, min: 0 },
    { name: 'hourly_salary', label: 'Hourly Salary', type: 'number', required: true, col: 8, min: 0 },
    { name: 'working_hour', label: 'Actual Working Hours', type: 'number', required: true, col: 8, min: 0 },
    // Section D: Calculation
    { name: 'salary_payable', label: 'Salary Payable', type: 'number', required: true, col: 8, min: 0 },
    { name: 'bonus', label: 'Bonus', type: 'number', col: 8, min: 0 },
    { name: 'bonus_comment', label: 'Bonus Remark', type: 'text', col: 8 },
    { name: 'deduction', label: 'Deduction', type: 'number', col: 8, min: 0 },
    { name: 'deduction_comment', label: 'Deduction Remark', type: 'text', col: 8 },
    { name: 'total_payable', label: 'Total Payable', type: 'number', required: true, col: 8, min: 0 },
    // Section E: Payment
    { name: 'payment_status', label: 'Payment Status', type: 'select', col: 12,
      options: ['UNPAID','PARTIAL','PAID'].map(v => ({ label: v, value: v })) },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    salary_month: Yup.number().required('Month is required').min(1).max(12),
    salary_year: Yup.number().required('Year is required').min(2000),
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
    total_payable: Yup.number().required().min(0),
    bonus: Yup.number().nullable().min(0),
    deduction: Yup.number().nullable().min(0),
    payment_status: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    user_id: null, salary_month: new Date().getMonth() + 1, salary_year: new Date().getFullYear(),
    salary: 0, paid_leave: 0, unpaid_leave: 0, monthly_holiday: 0, public_holiday: 0, work_day: 26,
    shift_wise_work_hour: 208, monthly_work_hour: 208, hourly_salary: 0, working_hour: 208,
    salary_payable: 0, bonus: null, bonus_comment: '', deduction: null, deduction_comment: '',
    total_payable: 0, payment_status: 'UNPAID', active: true,
  };

  const transformPayload = (v) => {
    const p = { ...v };
    p.active = Boolean(p.active);
    Object.keys(p).forEach(k => p[k] === '' && (p[k] = null));
    if (p.user_id && typeof p.user_id === 'object') p.user_id = p.user_id.id ?? p.user_id.value;
    return p;
  };

  const filters = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '',
    },
    {
      name: 'salary_month', label: 'Month', type: 'select',
      options: MONTHS.map((m, i) => ({ label: m, value: i + 1 })),
    },
    {
      name: 'payment_status', label: 'Payment', type: 'select',
      options: ['UNPAID','PARTIAL','PAID'].map(v => ({ label: v, value: v })),
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Payslips</h2>}>
      <Head title="Payslips" />
      <ReusableCrud
        icon={<DollarOutlined />}
        title="Payslip"
        apiUrl={api('/api/hrm/payslips')}
        columns={columns}
        fields={fields}
        filters={filters}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={900}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        canAdd canEdit canDelete hasActions hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
