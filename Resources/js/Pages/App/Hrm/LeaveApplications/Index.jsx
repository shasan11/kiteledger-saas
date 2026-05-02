import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const STATUS_COLORS = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'default' };
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function LeaveApplications(props) {
  const columns = [
    {
      title: 'Employee', key: 'user', width: 170,
      render: (_, r) => {
        const u = r.user;
        return u ? <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</strong> : '-';
      },
    },
    { title: 'Leave Type', dataIndex: 'leave_type', key: 'leave_type', sorter: true, render: (v) => v || '-' },
    { title: 'From', dataIndex: 'leave_from', key: 'leave_from', sorter: true, width: 100, render: fmtDate },
    { title: 'To', dataIndex: 'leave_to', key: 'leave_to', sorter: true, width: 100, render: fmtDate },
    {
      title: 'Duration', dataIndex: 'leave_duration', key: 'leave_duration', sorter: true, width: 90,
      render: (v) => v != null ? <Tag color="blue">{v} day{v !== 1 ? 's' : ''}</Tag> : '-',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', sorter: true, width: 110,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v || '—'}</Tag>,
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12 }}>{v.length > 50 ? v.slice(0,50)+'…' : v}</span></Tooltip> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '',
    },
    {
      name: 'leave_type', label: 'Leave Type', type: 'select', required: true, col: 12,
      options: ['Annual Leave','Sick Leave','Maternity Leave','Paternity Leave','Emergency Leave','Unpaid Leave','Casual Leave'].map(v => ({ label: v, value: v })),
    },
    { name: 'leave_from', label: 'Leave From', type: 'date', required: true, col: 8 },
    { name: 'leave_to', label: 'Leave To', type: 'date', required: true, col: 8 },
    { name: 'leave_duration', label: 'Duration (days)', type: 'number', col: 8, min: 0 },
    { name: 'reason', label: 'Reason', type: 'textarea', col: 24, rows: 2 },
    { name: 'attachment', label: 'Attachment', type: 'upload', col: 24 },
    {
      name: 'status', label: 'Status', type: 'select', col: 12,
      options: ['PENDING','APPROVED','REJECTED','CANCELLED'].map(v => ({ label: v, value: v })),
    },
    { name: 'review_comment', label: 'Review Comment', type: 'textarea', col: 12, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    leave_type: Yup.string().required('Leave type is required').max(60),
    leave_from: Yup.string().required('Leave from is required'),
    leave_to: Yup.string().required('Leave to is required'),
    leave_duration: Yup.number().nullable().min(0),
    reason: Yup.string().nullable().max(255),
    status: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    user_id: null, leave_type: '', leave_from: '', leave_to: '',
    leave_duration: null, reason: '', attachment: null,
    status: 'PENDING', review_comment: '', active: true,
  };

  const transformPayload = (v) => {
    const p = { ...v };
    p.active = Boolean(p.active);
    Object.keys(p).forEach(k => p[k] === '' && (p[k] = null));
    if (p.user_id && typeof p.user_id === 'object') p.user_id = p.user_id.id ?? p.user_id.value;
    return p;
  };

  const filters = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '',
    },
    {
      name: 'status', label: 'Status', type: 'select',
      options: ['PENDING','APPROVED','REJECTED','CANCELLED'].map(v => ({ label: v, value: v })),
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Leave Applications</h2>}>
      <Head title="Leave Applications" />
      <ReusableCrud
        icon={<ScheduleOutlined />}
        title="Leave Application"
        apiUrl={api('/api/hrm/leave-applications')}
        columns={columns}
        fields={fields}
        filters={filters}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={780}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        canAdd canEdit canDelete hasActions hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
