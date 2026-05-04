import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

export default function Designations(props) {
  const columns = [{ title: 'Name', dataIndex: 'name', key: 'name', sorter: true },{ title: 'Department', dataIndex: ['department', 'name'], key: 'department', render: (_,r)=>r?.department?.name||'-' },{ title: 'Status', dataIndex: 'active', key: 'active', sorter: true, render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag> }];
  const fields = [{ name: 'name', label: 'Name', type: 'text', required: true },{ name: 'department_id', label: 'Department', type: 'fkSelect', fkUrl: '/api/hrm/departments', fkValueKey: 'id', fkLabelKey: 'name', fkSearchParam: 'search', fkPageSize: 20 },{ name: 'active', label: 'Active', type: 'switch' }];
  const validationSchema = Yup.object().shape({ name: Yup.string().required('Name is required'), department_id: Yup.mixed().nullable(), active: Yup.boolean().nullable() });
  const initialValues = { name: '', department_id: null, active: true, deleted_item_ids: [] };
  const transformPayload = (v) => { const p = { ...v }; p.name = p.name?.trim() || null; p.department_id = p.department_id || null; p.active = Boolean(p.active); Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null)); return p; };
  return <AuthenticatedLayout user={props.auth?.user}><Head title="Designations" /><ReusableCrud icon={<AppstoreOutlined />} title="Designations" endpoint="/hrm/designations" columns={columns} fields={fields} validationSchema={validationSchema} initialValues={initialValues} transformPayload={transformPayload} form_ui="modal" modalWidth={900} searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering" activeParam="active" enableServerPagination={true} enableInactiveDrawer={true} backendFilter={{ active: 'active', department: 'department_id' }} backendSort={{ name: 'name', active: 'active' }} /></AuthenticatedLayout>;
}
