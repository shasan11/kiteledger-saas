import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Employees(props) {
  const columns = [
    { title: 'Employee ID', dataIndex: 'employee_id', key: 'employee_id', sorter: true },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Department', key: 'department', render: (_, r) => r?.department?.name || '-' },
    { title: 'Designation', key: 'designation', render: (_, r) => r?.designation?.name || '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'department_id', label: 'Department', type: 'fkSelect', fkUrl: '/api/hrm/departments', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'designation_id', label: 'Designation', type: 'fkSelect', fkUrl: '/api/hrm/designations', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search' },
    { name: 'joining_date', label: 'Joining Date', type: 'date' },
    { name: 'active', label: 'Active', type: 'switch' },
  ];
  const validationSchema = Yup.object().shape({ employee_id: Yup.string().required('Employee ID is required'), name: Yup.string().required('Name is required'), email: Yup.string().email().nullable(), phone: Yup.string().nullable(), department_id: Yup.mixed().nullable(), designation_id: Yup.mixed().nullable(), joining_date: Yup.string().nullable(), active: Yup.boolean().nullable() });
  const initialValues = { employee_id: '', name: '', email: '', phone: '', department_id: null, designation_id: null, joining_date: null, active: true, deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; ['employee_id','name','email','phone'].forEach((k)=>p[k]=p[k]?.trim()||null); p.department_id = p.department_id || null; p.designation_id = p.designation_id || null; p.active = Boolean(p.active); Object.keys(p).forEach((k)=>p[k]===''&&(p[k]=null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Employees" /><ReusableCrud icon={<AppstoreOutlined />} title="Employees" endpoint={api('/api/hrm/employees')} columns={columns} fields={fields} validationSchema={validationSchema} initialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={1000} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" activeParam="active" enableServerPagination={true} enableInactiveDrawer={true} backendFilter={{ active: 'active', department: 'department_id', designation: 'designation_id' }} backendSort={{ employee_id: 'employee_id', name: 'name', active: 'active' }} /></AuthenticatedLayout>;
}
