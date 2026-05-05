import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Departments(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Code', dataIndex: 'code', key: 'code', sorter: true },
    {
      title: 'Status', dataIndex: 'active', key: 'active', sorter: true,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
  ];
  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'code', label: 'Code', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'active', label: 'Active', type: 'switch' },
  ];
  const validationSchema = Yup.object().shape({ name: Yup.string().required('Name is required'), code: Yup.string().nullable(), description: Yup.string().nullable(), active: Yup.boolean().nullable() });
  const initialValues = { name: '', code: '', description: '', active: true, deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; p.name = p.name?.trim() || null; p.code = p.code?.trim() || null; p.description = p.description?.trim() || null; p.active = Boolean(p.active); Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Departments" /><ReusableCrud icon={<AppstoreOutlined />} title="Departments" apiUrl={api('/api/hrm/departments')} columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={900} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" activeParam="active" enableServerPagination={true} enableInactiveDrawer={true} backendFilter={{ active: 'active' }} backendSort={{ name: 'name', code: 'code', active: 'active' }} /></AuthenticatedLayout>;
}
