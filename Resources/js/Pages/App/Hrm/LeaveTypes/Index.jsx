import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { AppstoreOutlined } from '@ant-design/icons';
import { Card, Space, Tag, Typography, theme } from 'antd';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function LeaveTypes({ auth, embedded = false }) {
  const { token } = theme.useToken();

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', sorter: true },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', col: 12, required: true },
    { name: 'days_allowed', label: 'Days Allowed', type: 'number', col: 12, required: true },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    days_allowed: Yup.number().required('Days allowed is required').min(0),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    days_allowed: 0,
    active: true,
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.days_allowed =
      payload.days_allowed === '' || payload.days_allowed === null
        ? null
        : Number(payload.days_allowed);
    payload.active = Boolean(payload.active);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  const crud = (
    <ReusableCrud
      icon={<AppstoreOutlined />}
      title="Leave Types"
      apiUrl={api('/api/hrm/leave-types')}
      columns={columns}
      fields={fields}
      validationSchema={validationSchema}
      crudInitialValues={crudInitialValues}
      transformPayload={transformPayload}
      form_ui="drawer"
      drawerWidth={720}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      sortMode="ordering"
      orderingParam="ordering"
      activeParam="active"
      enableServerPagination={true}
      enableInactiveDrawer={true}
      backendFilter={{ active: 'active' }}
      backendSort={{ name: 'name', days_allowed: 'days_allowed', active: 'active' }}
      showSearch={true}
      canAdd={true}
      canEdit={true}
      canDelete={true}
      hasActions={true}
      hasActionColumns={true}
    />
  );

  if (embedded) return crud;

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Leave Types" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(250,173,20,0.09) 0%, rgba(22,119,255,0.05) 100%)',
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
                <AppstoreOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Leave Types</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Manage leave categories and configure allowed day limits for each type.
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
