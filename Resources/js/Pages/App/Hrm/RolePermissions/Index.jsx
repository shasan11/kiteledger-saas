import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function RolePermissions(props) {
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
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Role Permissions</h2>}>
      <Head title="Role Permissions" />
      <ReusableCrud icon={<SafetyCertificateOutlined />} title="Role Permission" apiUrl={api('/api/hrm/role-permissions')}
        columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="modal" modalWidth={600}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
