import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const PROJECT_STATUS_COLORS = { PENDING: 'default', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'red', ON_HOLD: 'orange' };
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function Projects(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Project Manager', key: 'pm', render: (_, r) => { const u=r.project_manager||r.projectManager; return u ? [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username : '-'; } },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', sorter: true, width: 105, render: fmtDate },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', sorter: true, width: 105, render: fmtDate },
    {
      title: 'Status', dataIndex: 'status', key: 'status', sorter: true, width: 120,
      render: (v) => <Tag color={PROJECT_STATUS_COLORS[v] || 'default'}>{v || '—'}</Tag>,
    },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'name', label: 'Project Name', type: 'text', required: true, col: 24 },
    { name: 'project_manager_id', label: 'Project Manager', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'status', label: 'Status', type: 'select', col: 12,
      options: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'].map(v => ({ label: v.replace('_',' '), value: v })) },
    { name: 'start_date', label: 'Start Date', type: 'date', col: 12 },
    { name: 'end_date', label: 'End Date', type: 'date', col: 12 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Project name is required').max(180),
    project_manager_id: Yup.mixed().required('Project manager is required'),
    status: Yup.string().nullable(),
    start_date: Yup.string().nullable(),
    end_date: Yup.string().nullable(),
    description: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', project_manager_id: null, status: 'PENDING', start_date: '', end_date: '', description: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    if (p.project_manager_id&&typeof p.project_manager_id==='object') p.project_manager_id=p.project_manager_id.id??p.project_manager_id.value;
    return p;
  };
  const filters = [
    { name: 'project_manager_id', label: 'Project Manager', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'status', label: 'Status', type: 'select', options: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED','ON_HOLD'].map(v => ({ label: v.replace('_',' '), value: v })) },
  ];
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Projects</h2>}>
      <Head title="Projects" />
      <ReusableCrud icon={<ProjectOutlined />} title="Project" apiUrl={api('/api/hrm/projects')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('hrm.projects.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        form_ui="drawer" drawerWidth={780}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
