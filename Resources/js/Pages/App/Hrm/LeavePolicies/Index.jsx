import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { FileProtectOutlined } from '@ant-design/icons';
import { Card, Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeavePolicies({ auth, embedded = false }) {
  const { token } = theme.useToken();

  const columns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Leave Type', dataIndex: 'leave_type', key: 'leave_type' },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', align: 'right' },
    { title: 'Carry Forward', dataIndex: 'carry_forward', key: 'carry_forward', render: (v) => v ? 'Yes' : 'No' },
  ], []);

  const fields = useMemo(() => [
    { name: 'name', label: 'Policy Name', type: 'text', col: 12, required: true },
    { name: 'leave_type', label: 'Leave Type', type: 'select', col: 12, options: [
      { value: 'annual', label: 'Annual Leave' },
      { value: 'sick', label: 'Sick Leave' },
      { value: 'maternity', label: 'Maternity Leave' },
      { value: 'paternity', label: 'Paternity Leave' },
      { value: 'unpaid', label: 'Unpaid Leave' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'days_allowed', label: 'Days Allowed', type: 'number', col: 8, min: 0 },
    { name: 'max_carry_forward_days', label: 'Max Carry Forward Days', type: 'number', col: 8, min: 0 },
    { name: 'carry_forward', label: 'Carry Forward', type: 'switch', col: 8 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
  ], []);

  const validationSchema = Yup.object({ name: Yup.string().required('Name is required') });
  const crudInitialValues = { name: '', leave_type: 'annual', days_allowed: 0, max_carry_forward_days: 0, carry_forward: false, description: '' };

  const crud = (
    <ReusableCrud
      title="Leave Policies"
      icon={<FileProtectOutlined />}
      apiUrl={api('/api/hrm/leave-policies/')}
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
      <Head title="Leave Policies" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(22,119,255,0.09) 0%, rgba(82,196,26,0.06) 100%)',
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
                <FileProtectOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Leave Policies</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Define leave policies, types, and carry-forward rules for your organization.
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
