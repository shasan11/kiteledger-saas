import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import * as Yup from 'yup';
import { Button, Card, Descriptions, Skeleton, Space, Tabs, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, ContactsOutlined, TeamOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const clean = (value) => (value === '' || value === undefined ? null : value);

export default function ContactGroupShow({ auth, id }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const response = await axios.get(api(`/api/contact-groups/${id}/`));
      setGroup(response.data?.data ?? response.data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to load contact group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [id]);

  const groupColumns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', backendSort: true, sortField: 'name', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (value) => value || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Active' : 'Inactive'}</Tag> },
  ], []);

  const groupFields = useMemo(() => [
    { name: 'name', label: 'Group Name', type: 'text', required: true, col: 24, placeholder: 'Related contact group' },
    { name: 'parent_id', label: 'Parent Group', type: 'fkSelect', col: 24, readOnly: true, fkUrl: api('/api/contact-groups/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, col: 24 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ], []);

  const contactColumns = useMemo(() => [
    { title: 'Name', dataIndex: 'name', key: 'name', backendSort: true, sortField: 'name', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Type', dataIndex: 'contact_type', key: 'contact_type', render: (value) => value ? <Tag>{String(value).toUpperCase()}</Tag> : '-' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (value) => value || '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (value) => value || '-' },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true, render: (value) => value || '-' },
  ], []);

  const contactFields = useMemo(() => [
    { name: 'name', label: 'Contact Name', type: 'text', required: true, col: 12 },
    { name: 'code', label: 'Code', type: 'text', col: 6 },
    {
      name: 'contact_type',
      label: 'Contact Type',
      type: 'select',
      required: true,
      col: 6,
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'supplier', label: 'Supplier' },
        { value: 'lead', label: 'Lead' },
      ],
    },
    { name: 'phone', label: 'Phone', type: 'text', col: 8 },
    { name: 'email', label: 'Email', type: 'text', col: 8 },
    { name: 'pan', label: 'PAN', type: 'text', col: 8 },
    { name: 'contact_group_id', label: 'Contact Group', type: 'fkSelect', readOnly: true, col: 12, fkUrl: api('/api/contact-groups/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'credit_limit', label: 'Credit Limit', type: 'number', col: 12 },
    { name: 'accept_purchase', label: 'Accept Purchase', type: 'switch', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
    { name: 'address', label: 'Address', type: 'textarea', rows: 2, col: 24 },
  ], []);

  const groupInitialValues = { name: '', parent_id: id, description: '', active: true };
  const contactInitialValues = { name: '', code: '', contact_type: 'customer', phone: '', email: '', pan: '', contact_group_id: id, credit_limit: null, accept_purchase: false, active: true, address: '' };

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={group?.name || 'Contact Group'} />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href={route('crm.contact-groups.index')}>Back to contact groups</Link>
          </Button>

          <Card>
            {loading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Title level={3} style={{ margin: 0 }}>{group?.name || 'Contact Group'}</Title>
                <Descriptions bordered size="small" column={3}>
                  <Descriptions.Item label="Parent">{group?.parent?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Contacts">{group?.contacts?.length ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={group?.active !== false ? 'green' : 'red'}>{group?.active !== false ? 'Active' : 'Inactive'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Description" span={3}>{group?.description || '-'}</Descriptions.Item>
                </Descriptions>
              </Space>
            )}
          </Card>

          <Tabs
            items={[
              {
                key: 'groups',
                label: 'Related Contact Group',
                children: (
                  <ReusableCrud
                    key={`child-groups-${id}`}
                    icon={<TeamOutlined />}
                    title="Related Contact Group"
                    apiUrl={api('/api/contact-groups/')}
                    baseFilters={{ parent_id: id }}
                    columns={groupColumns}
                    fields={groupFields}
                    validationSchema={Yup.object({ name: Yup.string().required('Name is required') })}
                    crudInitialValues={groupInitialValues}
                    transformPayload={(values) => ({ ...values, name: clean(values.name?.trim()), parent_id: id, description: clean(values.description?.trim()), active: values.active !== false })}
                    form_ui="modal"
                    modalWidth={620}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
              {
                key: 'contacts',
                label: 'Contact',
                children: (
                  <ReusableCrud
                    key={`contacts-${id}`}
                    icon={<ContactsOutlined />}
                    title="Contacts"
                    apiUrl={api('/api/contacts/')}
                    baseFilters={{ contact_group_id: id }}
                    columns={contactColumns}
                    fields={contactFields}
                    validationSchema={Yup.object({ name: Yup.string().required('Name is required'), email: Yup.string().nullable().email('Invalid email') })}
                    crudInitialValues={contactInitialValues}
                    transformPayload={(values) => ({
                      ...values,
                      name: clean(values.name?.trim()),
                      code: clean(values.code?.trim()),
                      phone: clean(values.phone?.trim()),
                      email: clean(values.email?.trim()),
                      pan: clean(values.pan?.trim()),
                      address: clean(values.address?.trim()),
                      contact_group_id: id,
                      credit_limit: values.credit_limit != null ? Number(values.credit_limit) : null,
                      accept_purchase: Boolean(values.accept_purchase),
                      active: values.active !== false,
                    })}
                    form_ui="drawer"
                    drawerWidth={820}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
            ]}
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
