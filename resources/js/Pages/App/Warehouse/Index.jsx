import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Tag, Typography } from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const extractId = (value) => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'object') {
    return value.id || value.value || null;
  }

  return value;
};

const cleanText = (value) => {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text || null;
};

export default function Warehouses(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      backendSort: true,
      sortField: 'name',
      render: (val) => (
        <Space>
          <InboxOutlined style={{ color: '#1677ff' }} />
          <Text strong>{val || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      backendSort: true,
      sortField: 'code',
      render: (val) => (val ? <Tag color="blue">{val}</Tag> : '-'),
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      render: (_, record) =>
        record?.branch?.label ||
        [record?.branch?.code, record?.branch?.name].filter(Boolean).join(' - ') ||
        record?.branch_name ||
        record?.branch_id_detail?.label ||
        record?.branch_id_detail?.name ||
        '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (val) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      backendSort: true,
      sortField: 'active',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'is_system_generated',
      key: 'is_system_generated',
      render: (value) => (
        <Tag color={value ? 'purple' : 'default'}>
          {value ? 'System' : 'Manual'}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Warehouse Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Main Warehouse',
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      col: 12,
      placeholder: 'e.g. WH-001',
    },
    {
      name: 'branch_id',
      label: 'Branch',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select branch',
      fkUrl: api('/api/branches/'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      labelField: 'branch_name',
      fkLabel: (row) =>
        [row?.code, row?.name].filter(Boolean).join(' - ') || row?.name || '',
      allowClear: true,
      storeFullObject: false,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 12,
    },
    {
      name: 'is_system_generated',
      label: 'System Generated',
      type: 'switch',
      col: 12,
      readOnly: true,
      disabled: true,
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Warehouse address',
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .transform((value) => (value === undefined || value === null ? '' : String(value)))
      .trim()
      .required('Warehouse name is required')
      .max(150, 'Warehouse name cannot exceed 150 characters'),

    code: Yup.string()
      .nullable()
      .transform((value) => {
        if (value === undefined || value === null || value === '') return null;
        return String(value).trim();
      })
      .max(30, 'Code cannot exceed 30 characters'),

    branch_id: Yup.mixed()
      .nullable()
      .test('valid-branch', 'Invalid branch selected', (value) => {
        const id = extractId(value);

        if (!id) return true;

        return uuidRegex.test(String(id));
      }),

    address: Yup.string()
      .nullable()
      .transform((value) => {
        if (value === undefined || value === null || value === '') return null;
        return String(value).trim();
      }),

    active: Yup.boolean().nullable(),

    is_system_generated: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    code: '',
    branch_id: null,
    branch_name: '',
    address: '',
    active: true,
    is_system_generated: false,
  };

  const transformPayload = (values = {}) => {
    const payload = {
      ...values,
      name: cleanText(values.name),
      code: cleanText(values.code),
      address: cleanText(values.address),
      branch_id: extractId(values.branch_id),
      active: values.active !== false,
      is_system_generated: Boolean(values.is_system_generated),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = null;
      }
    });

    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Warehouses" />

      <ReusableCrud
        icon={<HomeOutlined />}
        title="Warehouses"
        apiUrl={api('/api/warehouses/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={780}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
        showSearch={true}
        searchFields={['name', 'code', 'address']}
        defaultSortField="created_at"
        defaultSortOrder="descend"
        anchorFilters={[
          {
            key: 'manual',
            label: 'Manual',
            title: 'Warehouses',
            params: { is_system_generated: false },
          },
          {
            key: 'system',
            label: 'System',
            title: 'System Warehouses',
            params: { is_system_generated: true },
          },
        ]}
        defaultAnchorKey="manual"
        anchorSyncWithHash
        canAdd={true}
        canEdit={true}
        canDelete={true}
        canView={true}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (
              event.target.closest(
                'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger,.ant-select,.ant-picker'
              )
            ) {
              return;
            }

            router.visit(route('warehouse.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        hasActions={true}
        hasActionColumns={true}
        showRowActionMenu={true}
      />
    </AuthenticatedLayout>
  );
}