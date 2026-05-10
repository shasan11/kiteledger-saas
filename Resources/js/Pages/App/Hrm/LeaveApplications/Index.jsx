import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { FormOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const statusColor = (s) => ({ pending: 'default', approved: 'green', rejected: 'red', cancelled: 'volcano' }[s] || 'default');

export default function LeaveApplications({ auth }) {
  const columns = useMemo(() => [
    { title: 'Employee', dataIndex: ['employee', 'name'], key: 'employee_name', render: (v) => v || '-' },
    { title: 'Leave Policy', dataIndex: ['leavePolicy', 'name'], key: 'leave_policy', render: (v) => v || '-' },
    { title: 'From', dataIndex: 'from_date', key: 'from_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'To', dataIndex: 'to_date', key: 'to_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Days', dataIndex: 'total_days', key: 'total_days', align: 'right' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor(v)}>{v ? v.charAt(0).toUpperCase() + v.slice(1) : '-'}</Tag> },
  ], []);

  const fields = useMemo(() => [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/hrm/employees/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'leave_policy_id', label: 'Leave Policy', type: 'fkSelect', col: 12, fkUrl: api('/api/hrm/leave-policies/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'from_date', label: 'From Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'to_date', label: 'To Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'total_days', label: 'Total Days', type: 'number', col: 8, min: 0 },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { name: 'reason', label: 'Reason', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    employee_id: Yup.mixed().required('Employee is required'),
    from_date: Yup.string().required('From date is required'),
    to_date: Yup.string().required('To date is required'),
  });

  const crudInitialValues = { employee_id: null, leave_policy_id: null, from_date: null, to_date: null, total_days: null, status: 'pending', reason: '' };

  const transformPayload = (values) => ({ ...values, from_date: formatDate(values.from_date), to_date: formatDate(values.to_date) });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Applications" />
      <ReusableCrud
        title="Leave Applications"
        icon={<FormOutlined />}
        apiUrl={api('/api/hrm/leave-applications/')}
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
          { key: 'pending', label: 'Pending', params: { status: 'pending' } },
          { key: 'approved', label: 'Approved', params: { status: 'approved' } },
          { key: 'all', label: 'All', params: {} },
        ]}
        defaultAnchorKey="pending" anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}
