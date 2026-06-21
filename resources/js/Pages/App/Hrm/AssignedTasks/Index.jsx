import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function AssignedTasks(props) {
  const columns = [
    { title: 'Task', key: 'task', render: (_, r) => r?.task?.name ? <strong>{r.task.name}</strong> : '-' },
    { title: 'Project', key: 'project', render: (_, r) => r?.task?.project?.name || '-' },
    {
      title: 'Assignee', key: 'user',
      render: (_, r) => {
        const u = r.user; return u ? [u.first_name,u.last_name].filter(Boolean).join(' ')||u.username : '-';
      },
    },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'task_id', label: 'Task', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/tasks'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    task_id: Yup.mixed().required('Task is required'),
    user_id: Yup.mixed().required('Employee is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { task_id: null, user_id: null, active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (p.task_id&&typeof p.task_id==='object') p.task_id=p.task_id.id??p.task_id.value;
    if (p.user_id&&typeof p.user_id==='object') p.user_id=p.user_id.id??p.user_id.value;
    return p;
  };
  const filters = [
    { name: 'task_id', label: 'Task', type: 'fkSelect', fkUrl: api('/api/hrm/tasks'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'user_id', label: 'Employee', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Assigned Tasks" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
          <ReusableCrud icon={<UserAddOutlined />} title="Assigned Task" apiUrl={api('/api/hrm/assigned-tasks')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="modal" modalWidth={620}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
      </div>
    </AuthenticatedLayout>
  );
}
