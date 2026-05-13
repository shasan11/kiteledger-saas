import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { BankOutlined } from '@ant-design/icons';
import { Card, Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Departments({ auth, embedded = false }) {
  const { token } = theme.useToken();

  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Department Name', type: 'text', col: 12, required: true },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', description: '' };

  const crud = (
    <ReusableCrud
      title="Departments"
      icon={<BankOutlined />}
      apiUrl={api('/api/hrm/departments/')}
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
      <Head title="Departments" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(22,119,255,0.09) 0%, #ffffff 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size={14} align="center">
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#1677ff', color: '#ffffff', fontSize: 20, flexShrink: 0,
              }}>
                <BankOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Departments</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Manage company departments and organizational structure.
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
