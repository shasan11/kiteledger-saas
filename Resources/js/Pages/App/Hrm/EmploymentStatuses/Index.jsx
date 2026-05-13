import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { IdcardOutlined } from '@ant-design/icons';
import { Card, Space, Tag, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function EmploymentStatuses({ auth, embedded = false }) {
  const { token } = theme.useToken();

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

  const crud = (
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
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Employment Statuses" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(82,196,26,0.09) 0%, #ffffff 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size={14} align="center">
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#52c41a', color: '#ffffff', fontSize: 20, flexShrink: 0,
              }}>
                <IdcardOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Employment Statuses</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Configure employment status types and their visual color indicators.
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
