import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function PublicHolidays(props) {
  const columns = [
    { title: 'Holiday Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    {
      title: 'Date', dataIndex: 'date', key: 'date', sorter: true, width: 130,
      render: (v) => v ? <Tag color="blue">{new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Tag> : '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v.length > 60 ? v.slice(0,60)+'…' : v}</span></Tooltip> : '-' },
    { title: 'Branch', key: 'branch', render: (_, r) => r?.branch?.name || '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'name', label: 'Holiday Name', type: 'text', required: true, col: 16 },
    { name: 'date', label: 'Date', type: 'date', required: true, col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Holiday name is required').max(150),
    date: Yup.string().required('Date is required'),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', date: '', description: '', active: true };
  const transformPayload = (v) => { const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null)); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Public Holidays</h2>}>
      <Head title="Public Holidays" />
      <ReusableCrud icon={<CalendarOutlined />} title="Public Holiday" apiUrl={api('/api/hrm/public-holidays')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={680}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
