import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { ReadOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Educations({ auth }) {
  const columns = useMemo(() => [
    { title: 'Employee', dataIndex: ['employee', 'name'], key: 'employee_name', render: (v) => v || '-' },
    { title: 'Degree', dataIndex: 'degree', key: 'degree' },
    { title: 'Institution', dataIndex: 'institution', key: 'institution' },
    { title: 'Year', dataIndex: 'passing_year', key: 'passing_year' },
  ], []);

  const fields = useMemo(() => [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/hrm/employees/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'degree', label: 'Degree / Qualification', type: 'text', col: 12, required: true },
    { name: 'institution', label: 'Institution', type: 'text', col: 12 },
    { name: 'passing_year', label: 'Passing Year', type: 'text', col: 8, placeholder: 'e.g. 2020' },
    { name: 'grade', label: 'Grade / GPA', type: 'text', col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    employee_id: Yup.mixed().required('Employee is required'),
    degree: Yup.string().required('Degree is required'),
  });
  const crudInitialValues = { employee_id: null, degree: '', institution: '', passing_year: '', grade: '', description: '' };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Educations" />
      <ReusableCrud
        title="Educations"
        icon={<ReadOutlined />}
        apiUrl={api('/api/hrm/educations/')}
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
