import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function TaskStatuses(props) {
  const columns = [
    { title: 'Project', key: 'project', render: (_, r) => r?.project?.name || '-' },
    { title: 'Order', dataIndex: 'sort_order', key: 'sort_order', width: 90 },
    {
      title: 'Status', key: 'status',
      render: (_, r) => <Tag color={r.colour_value || 'default'} style={{ border: `1px solid ${r.colour_value||'#d9d9d9'}`, fontWeight: 600 }}>{r.name}</Tag>,
    },
    { title: 'Colour', dataIndex: 'colour_value', key: 'colour_value', width: 90, render: (v) => v ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: v, display: 'inline-block', border: '1px solid #eee' }} /><span style={{ fontSize: 11, color: '#888' }}>{v}</span></div> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'name', label: 'Status Name', type: 'text', required: true, col: 12 },
    { name: 'sort_order', label: 'Order', type: 'number', required: true, col: 12 },
    { name: 'colour_value', label: 'Colour', type: 'color', required: true, col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    project_id: Yup.mixed().required('Project is required'),
    name: Yup.string().required('Status name is required').max(100),
    sort_order: Yup.number().min(0).required('Order is required'),
    colour_value: Yup.string().required('Colour is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { project_id: null, name: '', sort_order: 1, colour_value: '#1677ff', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (p.project_id&&typeof p.project_id==='object') p.project_id=p.project_id.id??p.project_id.value;
    return p;
  };
  const filters = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Task Statuses" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
          <ReusableCrud icon={<AppstoreOutlined />} title="Task Status" apiUrl={api('/api/hrm/task-statuses')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="modal" modalWidth={600}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
      </div>
    </AuthenticatedLayout>
  );
}
