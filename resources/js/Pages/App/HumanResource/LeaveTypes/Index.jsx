import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeaveTypes(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Days', dataIndex: 'days_allowed', key: 'days_allowed', sorter: true },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'days_allowed', label: 'Days Allowed', type: 'number', required: true },
    { name: 'active', label: 'Active', type: 'switch' },
  ];
  const validationSchema = Yup.object().shape({ name: Yup.string().required('Name is required'), days_allowed: Yup.number().required('Days allowed is required').min(0), active: Yup.boolean().nullable() });
  const initialValues = { name: '', days_allowed: 0, active: true, deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; p.name = p.name?.trim() || null; p.days_allowed = p.days_allowed === '' || p.days_allowed === null ? null : Number(p.days_allowed); p.active = Boolean(p.active); Object.keys(p).forEach((k)=>p[k]===''&&(p[k]=null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Leave Types" /><ReusableCrud icon={<AppstoreOutlined />} title="Leave Types" endpoint={api('/api/hrm/leave-types')} columns={columns} fields={fields} validationSchema={validationSchema} initialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={900} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" activeParam="active" enableServerPagination={true} enableInactiveDrawer={true} backendFilter={{ active: 'active' }} backendSort={{ name: 'name', days_allowed: 'days_allowed', active: 'active' }} /></AuthenticatedLayout>;
}
