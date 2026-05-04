import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

export default function Attendance(props) {
  const columns = [
    { title: 'Employee', key: 'employee', render: (_, r) => r?.employee?.name || '-' },
    { title: 'Date', dataIndex: 'attendance_date', key: 'attendance_date', sorter: true },
    { title: 'Status', dataIndex: 'status', key: 'status', sorter: true, render: (s) => <Tag color={s === 'present' ? 'green' : s === 'absent' ? 'red' : 'orange'}>{s || '-'}</Tag> },
  ];
  const fields = [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', required: true, fkUrl: '/api/hrm/employees', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'attendance_date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Present', value: 'present' }, { label: 'Absent', value: 'absent' }, { label: 'Half Day', value: 'half_day' }, { label: 'Leave', value: 'leave' }] },
    { name: 'remarks', label: 'Remarks', type: 'textarea', rows: 3 },
  ];
  const validationSchema = Yup.object().shape({ employee_id: Yup.mixed().required('Employee is required'), attendance_date: Yup.string().required('Date is required'), status: Yup.string().required('Status is required'), remarks: Yup.string().nullable() });
  const initialValues = { employee_id: null, attendance_date: null, status: 'present', remarks: '', deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; p.employee_id = p.employee_id || null; p.remarks = p.remarks?.trim() || null; Object.keys(p).forEach((k)=>p[k]===''&&(p[k]=null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Attendance" /><ReusableCrud icon={<AppstoreOutlined />} title="Attendance" endpoint="/hrm/attendance" columns={columns} fields={fields} validationSchema={validationSchema} initialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={900} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" enableServerPagination={true} backendFilter={{ employee: 'employee_id', status: 'status' }} backendSort={{ attendance_date: 'attendance_date', status: 'status' }} /></AuthenticatedLayout>;
}
