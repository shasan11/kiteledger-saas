import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { BookOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function Educations(props) {
  const columns = [
    { title: 'Employee', key: 'user', width: 170, render: (_, r) => { const u=r.user; return u ? <strong>{[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username}</strong> : '-'; } },
    { title: 'Degree', dataIndex: 'degree', key: 'degree', sorter: true, render: (v) => v || '-' },
    { title: 'Institution', dataIndex: 'institution', key: 'institution', render: (v) => v || '-' },
    { title: 'Field of Study', dataIndex: 'field_of_study', key: 'field_of_study', render: (v) => v || '-' },
    { title: 'Result', dataIndex: 'result', key: 'result', width: 90, render: (v) => v || '-' },
    { title: 'Start', dataIndex: 'study_start_date', key: 'study_start_date', sorter: true, width: 100, render: fmtDate },
    { title: 'End', dataIndex: 'study_end_date', key: 'study_end_date', sorter: true, width: 100, render: fmtDate },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'degree', label: 'Degree', type: 'text', required: true, col: 12, placeholder: 'e.g. BSc, MBA' },
    { name: 'institution', label: 'Institution', type: 'text', required: true, col: 12 },
    { name: 'field_of_study', label: 'Field of Study', type: 'text', col: 12 },
    { name: 'result', label: 'Result / GPA', type: 'text', col: 12 },
    { name: 'study_start_date', label: 'Start Date', type: 'date', col: 12 },
    { name: 'study_end_date', label: 'End Date', type: 'date', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    degree: Yup.string().required('Degree is required').max(150),
    institution: Yup.string().required('Institution is required').max(180),
    field_of_study: Yup.string().nullable().max(150),
    result: Yup.string().nullable().max(60),
    study_start_date: Yup.string().nullable(),
    study_end_date: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { user_id: null, degree: '', institution: '', field_of_study: '', result: '', study_start_date: '', study_end_date: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    if (p.user_id&&typeof p.user_id==='object') p.user_id=p.user_id.id??p.user_id.value;
    return p;
  };
  const filters = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
  ];
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Education Records</h2>}>
      <Head title="Education" />
      <ReusableCrud icon={<BookOutlined />} title="Education" apiUrl={api('/api/hrm/educations')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth={760}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
