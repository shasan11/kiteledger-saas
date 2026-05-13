import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { ReadOutlined } from '@ant-design/icons';
import { Card, Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Educations({ auth, embedded = false }) {
  const { token } = theme.useToken();

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

  const crud = (
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
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Educations" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(19,194,194,0.09) 0%, #ffffff 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size={14} align="center">
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#13c2c2', color: '#ffffff', fontSize: 20, flexShrink: 0,
              }}>
                <ReadOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Educations</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Record employee educational qualifications and credentials.
                </Text>
              </div>
            </Space>
          </Card>
          {crud}
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
