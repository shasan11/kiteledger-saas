import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import { Button, Tag, Tooltip } from 'antd';
import { EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import AccessControlTabs from '../AccessControlTabs';
import {
  roleApi,
  roleFields,
  roleInitialValues,
  roleValidationSchema,
  transformRolePayload,
  transformRoleRecord,
} from './roleFormConfig';

export default function Roles(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (value) => <strong>{value}</strong> },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (value) =>
        value ? (
          <Tooltip title={value}>
            <span style={{ fontSize: 12, color: '#555' }}>
              {value.length > 70 ? `${value.slice(0, 70)}...` : value}
            </span>
          </Tooltip>
        ) : '-',
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_, record) => {
        const permissions = record.permissions || [];
        if (!permissions.length) return <span style={{ color: '#bbb' }}>-</span>;

        return (
          <span>
            {permissions.slice(0, 3).map((permission) => (
              <Tag key={permission.id} style={{ fontSize: 11, marginBottom: 2 }}>
                {permission.name}
              </Tag>
            ))}
            {permissions.length > 3 && <Tag style={{ fontSize: 11 }}>+{permissions.length - 3} more</Tag>}
          </span>
        );
      },
    },
    {
      title: 'System',
      dataIndex: 'is_system_generated',
      key: 'is_system_generated',
      width: 80,
      render: (value) => value ? <Tag color="purple">System</Tag> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      width: 80,
      render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      width: 110,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      title: 'Manage',
      key: 'manage',
      width: 110,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => router.visit(route('hrm.roles.edit', record.id))}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<AccessControlTabs activeKey="roles" />}>
      <Head title="Roles" />
      <ReusableCrud
        icon={<SafetyCertificateOutlined />}
        title="Role"
        apiUrl={roleApi('/api/hrm/roles')}
        columns={columns}
        fields={roleFields}
        validationSchema={roleValidationSchema}
        crudInitialValues={roleInitialValues}
        transformPayload={transformRolePayload}
        transformRecord={transformRoleRecord}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        custom_add
        custom_add_link={route('hrm.roles.create')}
        canAdd={false}
        canEdit={false}
        canDelete
        hasActions
        hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
