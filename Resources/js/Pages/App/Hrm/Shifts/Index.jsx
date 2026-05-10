import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { ClockCircleOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Shifts({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Start Time', dataIndex: 'start_time', key: 'start_time' },
    { title: 'End Time', dataIndex: 'end_time', key: 'end_time' },
    { title: 'Work Hours', dataIndex: 'work_hour', key: 'work_hour', render: (v) => v != null ? `${v} hrs` : '-' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Shift Name', type: 'text', col: 12, required: true },
    { name: 'start_time', label: 'Start Time', type: 'timePicker', col: 6, required: true, format: 'HH:mm' },
    { name: 'end_time', label: 'End Time', type: 'timePicker', col: 6, required: true, format: 'HH:mm' },
    { name: 'work_hour', label: 'Work Hours', type: 'number', col: 6, min: 0 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    start_time: Yup.string().required('Start time is required'),
    end_time: Yup.string().required('End time is required'),
  });

  const crudInitialValues = { name: '', start_time: null, end_time: null, work_hour: 8, description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Shifts" />
      <ReusableCrud
        title="Shifts"
        icon={<ClockCircleOutlined />}
        apiUrl={api('/api/hrm/shifts/')}
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
