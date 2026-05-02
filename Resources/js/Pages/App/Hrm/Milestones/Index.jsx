import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { FlagOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';
const STATUS_COLORS = { PENDING: 'default', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'red', ON_HOLD: 'orange' };

export default function Milestones(props) {
  const columns = [
    { title: 'Project', key: 'project', render: (_, r) => r?.project?.name || '-' },
    { title: 'Milestone', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', sorter: true, width: 105, render: fmtDate },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', sorter: true, width: 105, render: fmtDate },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v || '—'}</Tag> },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'name', label: 'Milestone Name', type: 'text', required: true, col: 24 },
    { name: 'start_date', label: 'Start Date', type: 'date', col: 12 },
    { name: 'end_date', label: 'End Date', type: 'date', col: 12 },
    { name: 'status', label: 'Status', type: 'select', col: 12, options: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'].map(v => ({ label: v.replace('_',' '), value: v })) },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    project_id: Yup.mixed().required('Project is required'),
    name: Yup.string().required('Name is required').max(180),
    start_date: Yup.string().nullable(),
    end_date: Yup.string().nullable(),
    status: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { project_id: null, name: '', start_date: '', end_date: '', status: 'PENDING', description: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    if (p.project_id&&typeof p.project_id==='object') p.project_id=p.project_id.id??p.project_id.value;
    return p;
  };
  const filters = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'status', label: 'Status', type: 'select', options: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'].map(v => ({ label: v.replace('_',' '), value: v })) },
  ];
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Milestones</h2>}>
      <Head title="Milestones" />
      <ReusableCrud icon={<FlagOutlined />} title="Milestone" apiUrl={api('/api/hrm/milestones')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth={720}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
