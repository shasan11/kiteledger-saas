import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { FileProtectOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeavePolicies({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Leave Type', dataIndex: 'leave_type', key: 'leave_type' },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', align: 'right' },
    { title: 'Carry Forward', dataIndex: 'carry_forward', key: 'carry_forward', render: (v) => v ? 'Yes' : 'No' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Policy Name', type: 'text', col: 12, required: true },
    { name: 'leave_type', label: 'Leave Type', type: 'select', col: 12, options: [
      { value: 'annual', label: 'Annual Leave' },
      { value: 'sick', label: 'Sick Leave' },
      { value: 'maternity', label: 'Maternity Leave' },
      { value: 'paternity', label: 'Paternity Leave' },
      { value: 'unpaid', label: 'Unpaid Leave' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'days_allowed', label: 'Days Allowed', type: 'number', col: 8, min: 0 },
    { name: 'max_carry_forward_days', label: 'Max Carry Forward Days', type: 'number', col: 8, min: 0 },
    { name: 'carry_forward', label: 'Carry Forward', type: 'switch', col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', leave_type: 'annual', days_allowed: 0, max_carry_forward_days: 0, carry_forward: false, description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Policies" />
      <ReusableCrud
        title="Leave Policies"
        icon={<FileProtectOutlined />}
        apiUrl={api('/api/hrm/leave-policies/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        form_ui="drawer"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
