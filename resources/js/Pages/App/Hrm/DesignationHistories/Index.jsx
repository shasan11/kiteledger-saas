import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { SolutionOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function DesignationHistories(props) {
  const columns = [
    { title: 'Employee', key: 'user', width: 170, render: (_, r) => { const u=r.user; return u ? <strong>{[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username}</strong> : '-'; } },
    { title: 'Designation', key: 'designation', render: (_, r) => r?.designation?.name || r?.designation_id_detail?.label || '-' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', sorter: true, width: 110, render: fmtDate },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', sorter: true, width: 110, render: fmtDate },
    { title: 'Comment', dataIndex: 'comment', key: 'comment', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12 }}>{v.length>50?v.slice(0,50)+'…':v}</span></Tooltip> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'designation_id', label: 'Designation', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/designations'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
    { name: 'start_date', label: 'Start Date', type: 'datetime', required: true, col: 12 },
    { name: 'end_date', label: 'End Date', type: 'datetime', col: 12 },
    { name: 'comment', label: 'Comment', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    designation_id: Yup.mixed().required('Designation is required'),
    start_date: Yup.string().required('Start date is required'),
    end_date: Yup.string().nullable(),
    comment: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { user_id: null, designation_id: null, start_date: '', end_date: '', comment: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    if (p.user_id&&typeof p.user_id==='object') p.user_id=p.user_id.id??p.user_id.value;
    if (p.designation_id&&typeof p.designation_id==='object') p.designation_id=p.designation_id.id??p.designation_id.value;
    return p;
  };
  const filters = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'designation_id', label: 'Designation', type: 'fkSelect', fkUrl: api('/api/hrm/designations'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Designation History" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
          <ReusableCrud icon={<SolutionOutlined />} title="Designation History" apiUrl={api('/api/hrm/designation-histories')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="drawer" drawerWidth={700}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
      </div>
    </AuthenticatedLayout>
  );
}
