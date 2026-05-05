import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { IdcardOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function EmploymentStatuses({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Color', dataIndex: 'colour_value', key: 'colour_value', render: (v) => v ? <Tag color={v}>{v}</Tag> : '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Status Name', type: 'text', col: 12, required: true },
    { name: 'colour_value', label: 'Color', type: 'text', col: 12, placeholder: 'e.g. #4CAF50 or green' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', colour_value: '', description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Employment Statuses" />
      <ReusableCrud
        title="Employment Statuses"
        icon={<IdcardOutlined />}
        apiUrl={api('/api/hrm/employment-statuses/')}
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
