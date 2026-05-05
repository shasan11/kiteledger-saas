import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { CheckCircleOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import dayjs from 'dayjs';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

const emptyAssignee = { user_id: null };

export default function Tasks({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, ellipsis: true },
    { title: 'Project', dataIndex: ['project', 'name'], key: 'project_name', render: (v) => v || '-' },
    { title: 'Priority', dataIndex: ['priority', 'name'], key: 'priority_name', render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: 'Status', dataIndex: ['taskStatus', 'name'], key: 'task_status', render: (v) => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Task Name', type: 'text', col: 16, required: true },
    { name: 'project_id', label: 'Project', type: 'fkSelect', col: 8, required: true, fkUrl: api('/api/hrm/projects/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'milestone_id', label: 'Milestone', type: 'fkSelect', col: 8, required: true, fkUrl: api('/api/hrm/milestones/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'priority_id', label: 'Priority', type: 'fkSelect', col: 8, required: true, fkUrl: api('/api/hrm/priorities/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'task_status_id', label: 'Status', type: 'fkSelect', col: 8, required: true, fkUrl: api('/api/hrm/task-statuses/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'start_date', label: 'Start Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'end_date', label: 'End Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'completion_time', label: 'Completion Time (hrs)', type: 'number', col: 8, min: 0 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3, required: true },
    {
      name: 'assigned_tasks', label: 'Assigned To', type: 'objectArray', col: 24,
      headerBg: '#1a3c5e', headerColor: '#ffffff', addButtonLabel: 'Add Assignee',
      defaultItem: { ...emptyAssignee },
      columns: [
        { key: 'user_id', name: 'user_id', label: 'User', type: 'fkSelect', width: '1fr', fkUrl: api('/api/hrm/users/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
      ],
    },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Task name is required'),
    project_id: Yup.mixed().required('Project is required'),
    milestone_id: Yup.mixed().required('Milestone is required'),
    priority_id: Yup.mixed().required('Priority is required'),
    task_status_id: Yup.mixed().required('Status is required'),
    start_date: Yup.string().required('Start date is required'),
    end_date: Yup.string().required('End date is required'),
    description: Yup.string().required('Description is required'),
  });

  const crudInitialValues = {
    name: '', project_id: null, milestone_id: null, priority_id: null,
    task_status_id: null, start_date: null, end_date: null,
    completion_time: 0, description: '',
    assigned_tasks: [{ ...emptyAssignee }],
    deleted_assigned_task_ids: [],
  };

  const transformPayload = (values) => ({
    ...values,
    start_date: formatDate(values.start_date),
    end_date: formatDate(values.end_date),
    deleted_assigned_task_ids: values.deleted_assigned_task_ids || [],
  });

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Tasks" />
      <ReusableCrud
        title="Tasks"
        icon={<CheckCircleOutlined />}
        apiUrl={api('/api/hrm/tasks/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer" drawerWidth="calc(100vw - 32px)"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
