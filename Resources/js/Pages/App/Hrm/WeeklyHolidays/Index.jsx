import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { CalendarOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export default function WeeklyHolidays({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Day', dataIndex: 'day', key: 'day', render: (v) => v ? <Tag>{v.charAt(0).toUpperCase() + v.slice(1)}</Tag> : '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'day', label: 'Day of Week', type: 'select', col: 12, required: true, options: DAY_OPTIONS },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    day: Yup.string().required('Day is required'),
  });
  const crudInitialValues = { name: '', day: 'saturday', description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Weekly Holidays" />
      <ReusableCrud
        title="Weekly Holidays"
        icon={<CalendarOutlined />}
        apiUrl={api('/api/hrm/weekly-holidaies/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        form_ui="drawer"
        searchParam="search" pageParam="page" pageSizeParam="page_size"
        sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
        showSearch={true} canAdd={true} canEdit={true} canDelete={true}
        hasActions={true} hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
