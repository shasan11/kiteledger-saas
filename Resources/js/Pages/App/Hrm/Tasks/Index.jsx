import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { CheckSquareOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function Tasks(props) {
  const columns = [
    { title: 'Task', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Project', key: 'project', render: (_, r) => r?.project?.name || '-' },
    { title: 'Milestone', key: 'milestone', render: (_, r) => r?.milestone?.name || '-' },
    {
      title: 'Priority', key: 'priority',
      render: (_, r) => {
        const p = r?.priority; if (!p) return '-';
        return <Tag color={p.colour_value || 'default'} style={{ border: `1px solid ${p.colour_value||'#d9d9d9'}` }}>{p.name}</Tag>;
      },
    },
    {
      title: 'Status', key: 'task_status',
      render: (_, r) => {
        const s = r?.task_status || r?.taskStatus; if (!s) return '-';
        return <Tag color={s.colour_value || 'default'} style={{ border: `1px solid ${s.colour_value||'#d9d9d9'}` }}>{s.name}</Tag>;
      },
    },
    { title: 'Start', dataIndex: 'start_date', key: 'start_date', sorter: true, width: 105, render: fmtDate },
    { title: 'End', dataIndex: 'end_date', key: 'end_date', sorter: true, width: 105, render: fmtDate },
    {
      title: 'Est. Hours', dataIndex: 'completion_time', key: 'completion_time', sorter: true, width: 100,
      render: (v) => v != null ? `${v}h` : '-',
    },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    // Basic
    { name: 'name', label: 'Task Name', type: 'text', required: true, col: 24 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    // Planning
    { name: 'project_id', label: 'Project', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'milestone_id', label: 'Milestone', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/milestones'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'start_date', label: 'Start Date', type: 'date', col: 8 },
    { name: 'end_date', label: 'End Date', type: 'date', col: 8 },
    { name: 'completion_time', label: 'Est. Hours', type: 'number', col: 8, min: 0 },
    // Classification
    { name: 'priority_id', label: 'Priority', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/priorities'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'task_status_id', label: 'Task Status', type: 'fkSelect', col: 12,
      fkUrl: api('/api/hrm/task-statuses'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Task name is required').max(255),
    project_id: Yup.mixed().required('Project is required'),
    milestone_id: Yup.mixed().nullable(),
    priority_id: Yup.mixed().nullable(),
    task_status_id: Yup.mixed().nullable(),
    start_date: Yup.string().nullable(),
    end_date: Yup.string().nullable(),
    completion_time: Yup.number().nullable().min(0),
    active: Yup.boolean().nullable(),
  });

  const initialValues = { name: '', description: '', project_id: null, milestone_id: null, start_date: '', end_date: '', completion_time: null, priority_id: null, task_status_id: null, active: true };

  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    ['project_id','milestone_id','priority_id','task_status_id'].forEach(k => {
      if (p[k]&&typeof p[k]==='object') p[k]=p[k].id??p[k].value;
    });
    return p;
  };

  const filters = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'milestone_id', label: 'Milestone', type: 'fkSelect', fkUrl: api('/api/hrm/milestones'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'priority_id', label: 'Priority', type: 'fkSelect', fkUrl: api('/api/hrm/priorities'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'task_status_id', label: 'Task Status', type: 'fkSelect', fkUrl: api('/api/hrm/task-statuses'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Tasks</h2>}>
      <Head title="Tasks" />
      <ReusableCrud icon={<CheckSquareOutlined />} title="Task" apiUrl={api('/api/hrm/tasks')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth={820}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
