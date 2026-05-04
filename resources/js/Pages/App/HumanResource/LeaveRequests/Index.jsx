import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeaveRequests(props) {
  const columns = [
    { title: 'Employee', key: 'employee', render: (_, r) => r?.employee?.name || '-' },
    { title: 'Leave Type', key: 'leave_type', render: (_, r) => r?.leave_type?.name || '-' },
    { title: 'From', dataIndex: 'start_date', key: 'start_date', sorter: true },
    { title: 'To', dataIndex: 'end_date', key: 'end_date', sorter: true },
    { title: 'Status', dataIndex: 'status', key: 'status', sorter: true, render: (s) => <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>{s || '-'}</Tag> },
  ];
  const fields = [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', required: true, fkUrl: '/api/hrm/employees', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'leave_type_id', label: 'Leave Type', type: 'fkSelect', required: true, fkUrl: '/api/hrm/leave-types', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }] },
    { name: 'reason', label: 'Reason', type: 'textarea', rows: 3 },
  ];
  const validationSchema = Yup.object().shape({ employee_id: Yup.mixed().required('Employee is required'), leave_type_id: Yup.mixed().required('Leave type is required'), start_date: Yup.string().required('Start date is required'), end_date: Yup.string().required('End date is required'), status: Yup.string().required('Status is required'), reason: Yup.string().nullable() });
  const initialValues = { employee_id: null, leave_type_id: null, start_date: null, end_date: null, status: 'pending', reason: '', deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; p.employee_id = p.employee_id || null; p.leave_type_id = p.leave_type_id || null; p.reason = p.reason?.trim() || null; Object.keys(p).forEach((k)=>p[k]===''&&(p[k]=null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Leave Requests" /><ReusableCrud icon={<AppstoreOutlined />} title="Leave Requests" endpoint={api('/api/hrm/leave-requests')} columns={columns} fields={fields} validationSchema={validationSchema} initialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={950} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" enableServerPagination={true} backendFilter={{ employee: 'employee_id', leave_type: 'leave_type_id', status: 'status' }} backendSort={{ start_date: 'start_date', end_date: 'end_date', status: 'status' }} /></AuthenticatedLayout>;
}
