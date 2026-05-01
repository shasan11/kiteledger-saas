import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { ControlOutlined } from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function UnitOfMeasurements(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val}</Text>,
    },
    {
      title: 'Short Name',
      dataIndex: 'short_name',
      key: 'short_name',
      render: (val) => val ? <Tag>{val}</Tag> : '-',
    },
    {
      title: 'Decimal Precision',
      dataIndex: 'precision',
      key: 'precision',
      align: 'center',
      render: (val) => val ?? 2,
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
      label: 'Unit Name',
      type: 'text',
      required: true,
      col: 12,
      placeholder: 'e.g. Kilogram',
    },
    {
      name: 'short_name',
      label: 'Short Name / Symbol',
      type: 'text',
      col: 12,
      placeholder: 'e.g. kg',
    },
    {
      name: 'precision',
      label: 'Decimal Precision',
      type: 'number',
      col: 12,
      min: 0,
      max: 10,
      placeholder: '2',
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 12,
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(100),
    short_name: Yup.string().nullable().max(30),
    precision: Yup.number().nullable().integer().min(0).max(10),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    name: '',
    short_name: '',
    precision: 2,
    active: true,
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.short_name = payload.short_name?.trim() || null;
    payload.precision = payload.precision != null ? Number(payload.precision) : null;
    payload.active = Boolean(payload.active);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Units of Measurement
        </h2>
      }
    >
      <Head title="Units of Measurement" />
      <ReusableCrud
        icon={<ControlOutlined />}
        title="Units of Measurement"
        apiUrl={api('/api/product-units')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={700}
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
