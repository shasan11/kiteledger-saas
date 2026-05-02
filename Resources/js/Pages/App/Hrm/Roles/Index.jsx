import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Roles(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v.length > 70 ? v.slice(0,70)+'…' : v}</span></Tooltip> : '-' },
    {
      title: 'Permissions', key: 'permissions',
      render: (_, r) => {
        const perms = r.permissions || [];
        if (!perms.length) return <span style={{ color: '#bbb' }}>—</span>;
        return (
          <span>
            {perms.slice(0, 3).map((p) => (
              <Tag key={p.id} style={{ fontSize: 11, marginBottom: 2 }}>{p.name}</Tag>
            ))}
            {perms.length > 3 && <Tag style={{ fontSize: 11 }}>+{perms.length - 3} more</Tag>}
          </span>
        );
      },
    },
    { title: 'System', dataIndex: 'is_system_generated', key: 'is_system_generated', width: 80, render: (v) => v ? <Tag color="purple">System</Tag> : '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'name', label: 'Role Name', type: 'text', required: true, col: 24, placeholder: 'e.g. HR Manager, Accountant' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 },
    {
      name: 'permissions',
      label: 'Permissions',
      type: 'fkMultiSelect',
      col: 24,
      fkUrl: api('/api/hrm/permissions'),
      fkSearchParam: 'search',
      fkPageSize: 50,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (r) => r?.name || '',
      placeholder: 'Select permissions…',
    },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Role name is required').max(150),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', description: '', permissions: [], active: true };
  const transformPayload = (v) => {
    const p = { ...v };
    p.name = p.name?.trim() || null;
    p.active = Boolean(p.active);
    p.permissions = Array.isArray(p.permissions) ? p.permissions.map(x => (typeof x === 'object' ? x.id ?? x.value : x)) : [];
    Object.keys(p).forEach(k => p[k] === '' && (p[k] = null));
    return p;
  };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Roles</h2>}>
      <Head title="Roles" />
      <ReusableCrud icon={<SafetyCertificateOutlined />} title="Role" apiUrl={api('/api/hrm/roles')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="drawer" drawerWidth={700}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
