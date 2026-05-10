import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { KeyOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Permissions(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{v}</code> },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v.length > 70 ? v.slice(0,70)+'…' : v}</span></Tooltip> : '-' },
    { title: 'System', dataIndex: 'is_system_generated', key: 'is_system_generated', width: 80, render: (v) => v ? <Tag color="purple">System</Tag> : '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'name', label: 'Permission Name', type: 'text', required: true, col: 24, placeholder: 'e.g. users.view, reports.export' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Permission name is required').max(150),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', description: '', active: true };
  const transformPayload = (v) => { const p={...v}; p.name=p.name?.trim()||null; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null)); return p; };
  return (
    <>
      <Head title="Permissions" />
      <ReusableCrud icon={<KeyOutlined />} title="Permission" apiUrl={api('/api/hrm/permissions')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={600}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </>
  );
}
