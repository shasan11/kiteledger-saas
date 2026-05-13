import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Card, Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function Shifts({ auth, embedded = false }) {
  const { token } = theme.useToken();

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

  const crud = (
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
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Shifts" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(114,46,209,0.09) 0%, #ffffff 100%)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
            }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Space size={14} align="center">
              <span style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#722ed1', color: '#ffffff', fontSize: 20, flexShrink: 0,
              }}>
                <ClockCircleOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Shifts</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Configure work shifts including start time, end time, and total hours.
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
