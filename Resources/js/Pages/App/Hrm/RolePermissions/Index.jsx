import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Typography, theme } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function RolePermissions(props) {
  const { token } = theme.useToken();
  const columns = [
    { title: 'Role', key: 'role', render: (_, r) => r?.role?.name ? <Tag color="blue">{r.role.name}</Tag> : '-' },
    { title: 'Permission', key: 'permission', render: (_, r) => r?.permission?.name ? <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>{r.permission.name}</code> : '-' },
    { title: 'Branch', key: 'branch', render: (_, r) => r?.branch?.name || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'role_id', label: 'Role', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/roles'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
    { name: 'permission_id', label: 'Permission', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/permissions'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    role_id: Yup.mixed().required('Role is required'),
    permission_id: Yup.mixed().required('Permission is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { role_id: null, permission_id: null, active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (p.role_id&&typeof p.role_id==='object') p.role_id=p.role_id.id??p.role_id.value;
    if (p.permission_id&&typeof p.permission_id==='object') p.permission_id=p.permission_id.id??p.permission_id.value;
    return p;
  };
  const filters = [
    { name: 'role_id', label: 'Role', type: 'fkSelect', fkUrl: api('/api/hrm/roles'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'permission_id', label: 'Permission', type: 'fkSelect', fkUrl: api('/api/hrm/permissions'), fkSearchParam: 'search', fkPageSize: 50, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Role Permissions" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(114,46,209,0.09) 0%, rgba(22,119,255,0.05) 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#722ed1', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <SafetyCertificateOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Role Permissions</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Map permissions to roles and control access across the system.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud icon={<SafetyCertificateOutlined />} title="Role Permission" apiUrl={api('/api/hrm/role-permissions')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="modal" modalWidth={600}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
