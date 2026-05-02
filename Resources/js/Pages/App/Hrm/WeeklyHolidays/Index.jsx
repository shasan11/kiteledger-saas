import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dayOptions = DAYS.map((d,i) => ({ label: d, value: i }));

export default function WeeklyHolidays(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Start Day', dataIndex: 'start_day', key: 'start_day', sorter: true, render: (v) => DAYS[v] ?? v },
    { title: 'End Day', dataIndex: 'end_day', key: 'end_day', sorter: true, render: (v) => DAYS[v] ?? v },
    {
      title: 'Preview', key: 'preview',
      render: (_, r) => <Tag color="geekblue">{DAYS[r.start_day] ?? r.start_day} – {DAYS[r.end_day] ?? r.end_day}</Tag>,
    },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true, col: 24 },
    { name: 'start_day', label: 'Start Day', type: 'select', required: true, col: 12, options: dayOptions },
    { name: 'end_day', label: 'End Day', type: 'select', required: true, col: 12, options: dayOptions },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    start_day: Yup.number().required('Start day is required').min(0).max(6),
    end_day: Yup.number().required('End day is required').min(0).max(6),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', start_day: 5, end_day: 6, active: true };
  const transformPayload = (v) => { const p={...v}; p.active=Boolean(p.active); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Weekly Holidays</h2>}>
      <Head title="Weekly Holidays" />
      <ReusableCrud icon={<CalendarOutlined />} title="Weekly Holiday" apiUrl={api('/api/hrm/weekly-holidays')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={600}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
