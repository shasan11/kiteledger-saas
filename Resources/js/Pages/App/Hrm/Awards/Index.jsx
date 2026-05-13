import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { TrophyOutlined } from '@ant-design/icons';
import { Card, Space, Typography, theme } from 'antd';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const formatDate = (v) => { if (!v) return null; const d = dayjs(v, 'DD-MM-YYYY', true); if (d.isValid()) return d.format('YYYY-MM-DD'); const d2 = dayjs(v); return d2.isValid() ? d2.format('YYYY-MM-DD') : v; };

export default function Awards({ auth, embedded = false }) {
  const { token } = theme.useToken();

  const columns = useMemo(() => [
    { title: 'Employee', dataIndex: ['employee', 'name'], key: 'employee_name', render: (v) => v || '-' },
    { title: 'Award Name', dataIndex: 'name', key: 'name' },
    { title: 'Award Date', dataIndex: 'award_date', key: 'award_date', render: (v) => v ? dayjs(v).format('DD-MM-YYYY') : '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  ], []);

  const fields = useMemo(() => [
    { name: 'employee_id', label: 'Employee', type: 'fkSelect', col: 12, required: true, fkUrl: api('/api/hrm/employees/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'name', label: 'Award Name', type: 'text', col: 12, required: true },
    { name: 'award_date', label: 'Award Date', type: 'datePicker', col: 8, format: 'DD-MM-YYYY' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({
    employee_id: Yup.mixed().required('Employee is required'),
    name: Yup.string().required('Award name is required'),
  });
  const crudInitialValues = { employee_id: null, name: '', award_date: null, description: '' };
  const transformPayload = (values) => ({ ...values, award_date: formatDate(values.award_date) });

  const crud = (
    <ReusableCrud
      title="Awards"
      icon={<TrophyOutlined />}
      apiUrl={api('/api/hrm/awards/')}
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
      <Head title="Awards" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(250,173,20,0.10) 0%, #ffffff 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size={14} align="center">
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#faad14', color: '#ffffff', fontSize: 20, flexShrink: 0,
              }}>
                <TrophyOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Awards</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Track and manage employee awards and recognitions.
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
