import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

export default function PublicHolidays({ auth, embedded = false }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Holiday Name', type: 'text', col: 12, required: true },
    { name: 'date', label: 'Date', type: 'datePicker', col: 8, required: true, format: 'DD-MM-YYYY' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    date: Yup.string().required('Date is required'),
  });
  const crudInitialValues = { name: '', date: null, description: '' };
  const transformPayload = (values) => ({ ...values, date: formatDate(values.date) });

  const crud = (
    <ReusableCrud
      title="Public Holidays"
      icon={<CalendarOutlined />}
      apiUrl={api('/api/hrm/public-holidays/')}
      columns={columns}
      fields={fields}
      validationSchema={validationSchema}
      crudInitialValues={crudInitialValues}
      transformPayload={transformPayload}
      form_ui="drawer"
      searchParam="search" pageParam="page" pageSizeParam="page_size"
      sortMode="ordering" orderingParam="ordering" enableServerPagination={true}
      showSearch={true} canAdd={true} canEdit={true} canDelete={true}
      hasActions={true} hasActionColumns={true}
    />
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Public Holidays" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
        {crud}
      </div>
    </AuthenticatedLayout>
  );
}
