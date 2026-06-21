import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function ProjectTeams(props) {
  const columns = [
    { title: 'Team Name', dataIndex: 'project_team_name', key: 'project_team_name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Project', key: 'project', render: (_, r) => r?.project?.name || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'project_team_name', label: 'Team Name', type: 'text', required: true, col: 24 },
    { name: 'project_id', label: 'Project', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    project_team_name: Yup.string().required('Team name is required').max(180),
    project_id: Yup.mixed().required('Project is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { project_team_name: '', project_id: null, active: true };
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
      <Head title="Project Teams" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
          <ReusableCrud icon={<TeamOutlined />} title="Project Team" apiUrl={api('/api/hrm/project-teams')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="drawer" drawerWidth={680}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
      </div>
    </AuthenticatedLayout>
  );
}
