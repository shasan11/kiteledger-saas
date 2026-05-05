import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { FlagOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Priorities({ auth }) {
  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Color', dataIndex: 'color', key: 'color', render: (v) => v ? <Tag color={v}>{v}</Tag> : '-' },
    { title: 'Sort Order', dataIndex: 'sort_order', key: 'sort_order', align: 'right' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Priority Name', type: 'text', col: 12, required: true },
    { name: 'color', label: 'Color', type: 'text', col: 8, placeholder: 'e.g. #FF4D4F or red' },
    { name: 'sort_order', label: 'Sort Order', type: 'number', col: 8, min: 0 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', color: '', sort_order: 0 };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Priorities" />
      <ReusableCrud
        title="Priorities"
        icon={<FlagOutlined />}
        apiUrl={api('/api/hrm/priorities/')}
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
