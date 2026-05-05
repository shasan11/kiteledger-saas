import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { CheckSquareOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'late', label: 'Late' },
  { value: 'on_leave', label: 'On Leave' },
];

const statusColor = (s) => ({ present: 'green', absent: 'red', half_day: 'orange', late: 'gold', on_leave: 'blue' }[s] || 'default');

export default function Attendance({ auth }) {
  const columns = useMemo(() => [
    { title: 'Employee', dataIndex: ['employee', 'name'], key: 'employee_name', render: (v) => v || '-' },
    { title: 'Date', dataIndex: 'date', key: 'date', sorter: true, render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor(v)}>{v || '-'}</Tag> },
    { title: 'Check In', dataIndex: 'check_in', key: 'check_in' },
    { title: 'Check Out', dataIndex: 'check_out', key: 'check_out' },
    { title: 'Work Hours', dataIndex: 'work_hour', key: 'work_hour', render: (v) => v != null ? `${v} hrs` : '-' },
  ], []);

  const fields = useMemo(() => [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/hrm/employees/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'date', label: 'Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'status', label: 'Status', type: 'select', col: 8, required: true, options: STATUS_OPTIONS },
    { name: 'check_in', label: 'Check In', type: 'timePicker', col: 6, format: 'HH:mm' },
    { name: 'check_out', label: 'Check Out', type: 'timePicker', col: 6, format: 'HH:mm' },
    { name: 'work_hour', label: 'Work Hours', type: 'number', col: 6, min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 2 },
  ], []);

  const validationSchema = Yup.object({
    employee_id: Yup.mixed().required('Employee is required'),
    date: Yup.string().required('Date is required'),
    status: Yup.string().required('Status is required'),
  });
  const crudInitialValues = { employee_id: null, date: dayjs().format('YYYY-MM-DD'), status: 'present', check_in: null, check_out: null, work_hour: null, notes: '' };

  const transformPayload = (values) => ({ ...values, date: formatDate(values.date) });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Attendance" />
      <ReusableCrud
        title="Attendance"
        icon={<CheckSquareOutlined />}
        apiUrl={api('/api/hrm/attendances/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
        anchorFilters={[
          { key: 'present', label: 'Present', params: { status: 'present' } },
          { key: 'absent', label: 'Absent', params: { status: 'absent' } },
          { key: 'all', label: 'All', params: {} },
        ]}
        defaultAnchorKey="all"
      />
    </AuthenticatedLayout>
  );
}
