import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Badge } from 'antd';
import { TagsOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ReportingTags(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color) => color ? <Tag color={color}>{color}</Tag> : '-',
    },
    { title: 'Description', dataIndex: 'description', key: 'description', sorter: true },
    {
      title: 'Lines',
      dataIndex: 'lines',
      key: 'lines',
      render: (lines) => <Badge count={Array.isArray(lines) ? lines.length : 0} showZero style={{ backgroundColor: '#1890ff' }} />,
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'color', label: 'Color', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    {
      name: 'lines',
      label: 'Tag Lines',
      type: 'objectArray',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'color', label: 'Color', type: 'text' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    color: Yup.string().nullable(),
    description: Yup.string().nullable(),
    lines: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Line name is required'),
        color: Yup.string().nullable(),
        sort_order: Yup.number().nullable(),
      })
    ),
  });

  const crudInitialValues = {
    name: '',
    color: '',
    description: '',
    lines: [],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.deleted_item_ids = Array.isArray(payload.deleted_item_ids) ? payload.deleted_item_ids : [];
    Object.keys(payload).forEach((key) => {
      if (key !== 'lines' && key !== 'deleted_item_ids' && payload[key] === '') {
        payload[key] = null;
      }
    });
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Reporting Tags" />
      <ReusableCrud
        icon={<TagsOutlined />}
        title="Reporting Tags"
        apiUrl={api('/api/reporting-tags/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1000}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination={true}
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
