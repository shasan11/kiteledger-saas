import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { DollarOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => toNumber(v).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };
const statusColor = (s) => ({ draft: 'default', approved: 'green', paid: 'blue', cancelled: 'red' }[s] || 'default');

const emptyEarning = { title: '', amount: 0 };
const emptyDeduction = { title: '', amount: 0 };

export default function Payslips({ auth }) {
  const columns = useMemo(() => [
    { title: 'Employee', dataIndex: ['employee', 'name'], key: 'employee_name', render: (v) => v || '-' },
    { title: 'Period', dataIndex: 'pay_period', key: 'pay_period' },
    { title: 'Gross Salary', dataIndex: 'gross_salary', key: 'gross_salary', align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
    { title: 'Net Salary', dataIndex: 'net_salary', key: 'net_salary', align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor(v)}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag> },
  ], []);

  const fields = useMemo(() => [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/hrm/employees/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'pay_period', label: 'Pay Period', type: 'text', col: 8, placeholder: 'e.g. January 2024' },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: [
      { value: 'draft', label: 'Draft' },
      { value: 'approved', label: 'Approved' },
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { name: 'from_date', label: 'From Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'to_date', label: 'To Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'payment_date', label: 'Payment Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'basic_salary', label: 'Basic Salary', type: 'number', col: 8, min: 0 },
    { name: 'gross_salary', label: 'Gross Salary', type: 'number', col: 8, min: 0 },
    { name: 'net_salary', label: 'Net Salary', type: 'number', col: 8, min: 0 },
    {
      name: 'earnings', label: 'Earnings', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Earning',
      defaultItem: { ...emptyEarning },
      columns: [
        { key: 'title', name: 'title', label: 'Title', type: 'text', width: '3fr' },
        { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '180px', min: 0 },
      ],
    },
    {
      name: 'deductions', label: 'Deductions', type: 'objectArray', col: 24,
      headerBg: '#5e1a1a', headerColor: '#ffffff', addButtonLabel: 'Add Deduction',
      defaultItem: { ...emptyDeduction },
      columns: [
        { key: 'title', name: 'title', label: 'Title', type: 'text', width: '3fr' },
        { key: 'amount', name: 'amount', label: 'Amount', type: 'number', width: '180px', min: 0 },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2 },
  ], []);

  const validationSchema = Yup.object({
    employee_id: Yup.mixed().required('Employee is required'),
  });

  const crudInitialValues = {
    employee_id: null, pay_period: '', status: 'draft',
    from_date: null, to_date: null, payment_date: null,
    basic_salary: 0, gross_salary: 0, net_salary: 0,
    earnings: [{ ...emptyEarning }], deductions: [{ ...emptyDeduction }],
    deleted_earning_ids: [], deleted_deduction_ids: [],
    notes: '',
  };

  const transformPayload = (values) => ({
    ...values,
    from_date: formatDate(values.from_date),
    to_date: formatDate(values.to_date),
    payment_date: formatDate(values.payment_date),
    basic_salary: toNumber(values.basic_salary),
    gross_salary: toNumber(values.gross_salary),
    net_salary: toNumber(values.net_salary),
    earnings: (values.earnings || []).map((r) => ({ ...r, amount: toNumber(r.amount) })),
    deductions: (values.deductions || []).map((r) => ({ ...r, amount: toNumber(r.amount) })),
  });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Payslips" />
      <ReusableCrud
        title="Payslips"
        icon={<DollarOutlined />}
        apiUrl={api('/api/hrm/payslips/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer" drawerWidth="calc(100vw - 32px)"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
        anchorFilters={[
          { key: 'draft', label: 'Draft', params: { status: 'draft' } },
          { key: 'approved', label: 'Approved', params: { status: 'approved' } },
          { key: 'paid', label: 'Paid', params: { status: 'paid' } },
          { key: 'all', label: 'All', params: {} },
        ]}
        defaultAnchorKey="draft" anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
