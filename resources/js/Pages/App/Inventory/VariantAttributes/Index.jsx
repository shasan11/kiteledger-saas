import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { BarsOutlined } from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const emptyItem = {
  value: '',
  sort_order: 0,
  active: true,
};

export default function VariantAttributes(props) {
  const columns = [
    {
      title: 'Attribute Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Values',
      dataIndex: 'variantLines',
      key: 'variantLines',
      render: (_, record) => {
        const lines = record?.variantLines || record?.variant_lines || [];
        if (!lines.length) return '-';
        return lines.slice(0, 5).map((l) => (
          <Tag key={l.id || l.value} color="purple" style={{ marginBottom: 2 }}>
            {l.value}
          </Tag>
        ));
      },
    },
    {
      title: 'Total Values',
      dataIndex: 'variantLines',
      key: 'count',
      align: 'center',
      render: (_, record) => {
        const lines = record?.variantLines || record?.variant_lines || [];
        return lines.length;
      },
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Attribute Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Color, Size, Material',
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 12,
    },
    {
      name: 'items',
      label: 'Attribute Values',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Value',
      defaultItem: { ...emptyItem },
      columns: [
        {
          key: 'value',
          name: 'value',
          label: 'Value',
          type: 'text',
          width: '3fr',
          placeholder: 'e.g. Red, Small, Cotton',
        },
        {
          key: 'sort_order',
          name: 'sort_order',
          label: 'Sort Order',
          type: 'number',
          width: '130px',
          min: 0,
          placeholder: '0',
        },
        {
          key: 'active',
          name: 'active',
          label: 'Active',
          type: 'switch',
          width: '100px',
        },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Attribute name is required').max(80),
    active: Yup.boolean().nullable(),
    items: Yup.array()
      .of(
        Yup.object().shape({
          value: Yup.string().required('Value is required').max(80),
          sort_order: Yup.number().nullable().integer().min(0),
          active: Yup.boolean().nullable(),
        }),
      )
      .min(1, 'At least one value is required'),
  });

  const crudInitialValues = {
    name: '',
    active: true,
    items: [{ ...emptyItem }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.active = Boolean(payload.active);
    payload.items = (payload.items || [])
      .filter((row) => row.value?.trim())
      .map((row) => ({
        id: row.id,
        value: row.value?.trim(),
        sort_order: row.sort_order != null ? Number(row.sort_order) : 0,
        active: row.active !== false,
      }));
    payload.deleted_item_ids = Array.isArray(payload.deleted_item_ids)
      ? payload.deleted_item_ids
      : [];
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Variant Attributes
        </h2>
      }
    >
      <Head title="Variant Attributes" />
      <ReusableCrud
        icon={<BarsOutlined />}
        title="Variant Attributes"
        apiUrl={api('/api/variants')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={900}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
