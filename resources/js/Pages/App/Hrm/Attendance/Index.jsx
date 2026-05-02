import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip, Card, Statistic, Row, Col } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const IN_STATUS_COLORS = { ON_TIME: 'green', LATE: 'orange', EARLY: 'cyan', MANUAL: 'purple' };
const OUT_STATUS_COLORS = { ON_TIME: 'green', EARLY_LEFT: 'orange', OVERTIME: 'blue', MANUAL: 'purple' };

const fmtDateTime = (v) => v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function Attendance(props) {
  const columns = [
    {
      title: 'Employee', key: 'user', width: 180,
      render: (_, r) => {
        const u = r.user;
        const name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username : '-';
        return <span style={{ fontWeight: 600 }}>{name}</span>;
      },
    },
    { title: 'In Time', dataIndex: 'in_time', key: 'in_time', sorter: true, width: 145, render: fmtDateTime },
    { title: 'Out Time', dataIndex: 'out_time', key: 'out_time', sorter: true, width: 145, render: fmtDateTime },
    {
      title: 'Hours', dataIndex: 'total_hour', key: 'total_hour', sorter: true, width: 80,
      render: (v) => v != null ? <Tag color="blue">{Number(v).toFixed(1)}h</Tag> : '-',
    },
    {
      title: 'In Status', dataIndex: 'in_time_status', key: 'in_time_status', width: 110,
      render: (v) => v ? <Tag color={IN_STATUS_COLORS[v] || 'default'}>{v}</Tag> : '-',
    },
    {
      title: 'Out Status', dataIndex: 'out_time_status', key: 'out_time_status', width: 110,
      render: (v) => v ? <Tag color={OUT_STATUS_COLORS[v] || 'default'}>{v}</Tag> : '-',
    },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 120, render: (v) => <code style={{ fontSize: 11 }}>{v || '-'}</code> },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '',
    },
    { name: 'in_time', label: 'In Time', type: 'datetime', required: true, col: 12 },
    { name: 'out_time', label: 'Out Time', type: 'datetime', col: 12 },
    { name: 'total_hour', label: 'Total Hours', type: 'number', col: 8, min: 0 },
    {
      name: 'in_time_status', label: 'In Status', type: 'select', col: 8,
      options: ['ON_TIME','LATE','EARLY','MANUAL'].map(v => ({ label: v, value: v })),
    },
    {
      name: 'out_time_status', label: 'Out Status', type: 'select', col: 8,
      options: ['ON_TIME','EARLY_LEFT','OVERTIME','MANUAL'].map(v => ({ label: v, value: v })),
    },
    { name: 'ip', label: 'IP Address', type: 'text', col: 12 },
    { name: 'comment', label: 'Comment', type: 'textarea', col: 12, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    in_time: Yup.string().required('In time is required'),
    out_time: Yup.string().nullable(),
    total_hour: Yup.number().nullable().min(0),
    in_time_status: Yup.string().nullable(),
    out_time_status: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    user_id: null, in_time: '', out_time: '', total_hour: null,
    in_time_status: 'ON_TIME', out_time_status: 'ON_TIME',
    ip: '', comment: '', active: true,
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
      name: 'in_time_status', label: 'In Status', type: 'select',
      options: ['ON_TIME','LATE','EARLY','MANUAL'].map(v => ({ label: v, value: v })),
    },
    {
      name: 'out_time_status', label: 'Out Status', type: 'select',
      options: ['ON_TIME','EARLY_LEFT','OVERTIME','MANUAL'].map(v => ({ label: v, value: v })),
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Attendance</h2>}>
      <Head title="Attendance" />
      <ReusableCrud
        icon={<ClockCircleOutlined />}
        title="Attendance"
        apiUrl={api('/api/hrm/attendances')}
        columns={columns}
        fields={fields}
        filters={filters}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={720}
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
