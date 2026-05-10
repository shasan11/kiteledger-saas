import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const STATUS_COLORS = { PENDING: 'gold', IN_PROGRESS: 'blue', COMPLETED: 'green', SKIPPED: 'default' };
const fmtDate = (v) => v ? dayjs(v).format('DD MMM YYYY') : '-';

export default function OnboardingIndex(props) {
  const columns = [
    {
      title: 'Employee', key: 'employee', render: (_, r) => {
        const u = r.user;
        return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '-' : '-';
      },
    },
    { title: 'Type', dataIndex: 'type', width: 120, render: (v) => <Tag color={v === 'ONBOARDING' ? 'blue' : 'volcano'}>{v}</Tag> },
    { title: 'Task', dataIndex: 'title', render: (v) => <strong>{v}</strong> },
    { title: 'Due', dataIndex: 'due_date', width: 110, render: fmtDate },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{String(v || '').replace(/_/g, ' ')}</Tag>,
    },
    { title: 'Active', dataIndex: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name',
      fkLabel: (r) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.username || '',
    },
    {
      name: 'type', label: 'Type', type: 'select', required: true, col: 12,
      options: [{ label: 'Onboarding', value: 'ONBOARDING' }, { label: 'Offboarding', value: 'OFFBOARDING' }],
    },
    { name: 'title', label: 'Task Title', type: 'text', required: true, col: 24 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24 },
    { name: 'due_date',    label: 'Due Date',     type: 'date', col: 12 },
    { name: 'completed_at', label: 'Completed At', type: 'date', col: 12 },
    {
      name: 'status', label: 'Status', type: 'select', col: 12,
      options: ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED'].map(v => ({ label: v.replace(/_/g,' '), value: v })),
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    type:    Yup.string().required('Type is required'),
    title:   Yup.string().required('Title is required').max(180),
  });

  const filters = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name',
      fkLabel: (r) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.username || '',
    },
    { name: 'type', label: 'Type', type: 'select',
      options: [{ label: 'Onboarding', value: 'ONBOARDING' }, { label: 'Offboarding', value: 'OFFBOARDING' }] },
    { name: 'status', label: 'Status', type: 'select',
      options: ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED'].map(v => ({ label: v.replace(/_/g,' '), value: v })) },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Onboarding & Offboarding</h2>}>
      <Head title="Onboarding & Offboarding" />
      <ReusableCrud
        icon={<CheckCircleOutlined />}
        title="Checklist Item"
        apiUrl={api('/api/hrm/onboarding-checklists')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={{ user_id: null, type: 'ONBOARDING', title: '', description: '', due_date: '', completed_at: '', status: 'PENDING', notes: '', active: true }}
        filters={filters}
        anchorFilters={[
          { label: 'Onboarding',   key: 'ONBOARDING',   paramKey: 'type' },
          { label: 'Offboarding',  key: 'OFFBOARDING',  paramKey: 'type' },
          { label: 'All',          key: 'all' },
        ]}
        defaultAnchorKey="ONBOARDING"
        form_ui="modal"
        modalWidth={700}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        canAdd canEdit canDelete hasActions hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
