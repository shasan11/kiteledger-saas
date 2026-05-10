import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { UsergroupAddOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function ProjectTeamMembers(props) {
  const columns = [
    { title: 'Team', key: 'project_team', render: (_, r) => r?.project_team?.project_team_name || '-' },
    { title: 'Project', key: 'project', render: (_, r) => r?.project_team?.project?.name || '-' },
    {
      title: 'Member', key: 'user',
      render: (_, r) => {
        const u = r.user; return u ? <strong>{[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username}</strong> : '-';
      },
    },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'project_team_id', label: 'Project Team', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/project-teams'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'project_team_name', fkLabel: (r) => r?.project_team_name||'' },
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    project_team_id: Yup.mixed().required('Project team is required'),
    user_id: Yup.mixed().required('Employee is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { project_team_id: null, user_id: null, active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (p.project_team_id&&typeof p.project_team_id==='object') p.project_team_id=p.project_team_id.id??p.project_team_id.value;
    if (p.user_id&&typeof p.user_id==='object') p.user_id=p.user_id.id??p.user_id.value;
    return p;
  };
  const filters = [
    { name: 'project_team_id', label: 'Team', type: 'fkSelect', fkUrl: api('/api/hrm/project-teams'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'project_team_name', fkLabel: (r) => r?.project_team_name||'' },
    { name: 'user_id', label: 'Employee', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
  ];
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Project Team Members</h2>}>
      <Head title="Team Members" />
      <ReusableCrud icon={<UsergroupAddOutlined />} title="Team Member" apiUrl={api('/api/hrm/project-team-members')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="modal" modalWidth={620}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
