import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography } from 'antd';
import { NodeIndexOutlined } from '@ant-design/icons';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const emptyStage = {
  name: '',
  color: '',
  probability: null,
  sort_order: null,
  is_won_stage: false,
  is_lost_stage: false,
};

export default function DealPipelines(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (val) => val || '-',
    },
    {
      title: 'Default',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 100,
      render: (val) => (
        <Tag color={val ? 'green' : 'default'}>
          {val ? 'Yes' : 'No'}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'name',
      label: 'Pipeline Name',
      type: 'text',
      required: true,
      col: 16,
      placeholder: 'e.g. Sales Pipeline',
    },
    {
      name: 'is_default',
      label: 'Default Pipeline',
      type: 'switch',
      col: 8,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 2,
      placeholder: 'Optional description',
    },
    {
      name: 'stages',
      label: 'Pipeline Stages',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Stage',
      defaultItem: { ...emptyStage },
      columns: [
        {
          key: 'name',
          name: 'name',
          label: 'Stage Name',
          type: 'text',
          width: '2fr',
          placeholder: 'e.g. Prospecting',
          required: true,
        },
        {
          key: 'color',
          name: 'color',
          label: 'Color',
          type: 'text',
          width: '100px',
          placeholder: '#3b82f6',
        },
        {
          key: 'probability',
          name: 'probability',
          label: 'Probability %',
          type: 'number',
          width: '100px',
          min: 0,
          max: 100,
          placeholder: '0-100',
        },
        {
          key: 'sort_order',
          name: 'sort_order',
          label: 'Order',
          type: 'number',
          width: '80px',
          min: 0,
          placeholder: '0',
        },
        {
          key: 'is_won_stage',
          name: 'is_won_stage',
          label: 'Won',
          type: 'switch',
          width: '70px',
        },
        {
          key: 'is_lost_stage',
          name: 'is_lost_stage',
          label: 'Lost',
          type: 'switch',
          width: '70px',
        },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    is_default: Yup.boolean().nullable(),
    description: Yup.string().nullable(),
    stages: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Stage name is required').max(120),
        color: Yup.string().nullable().max(20),
        probability: Yup.number().nullable().min(0).max(100),
        sort_order: Yup.number().nullable().min(0),
        is_won_stage: Yup.boolean().nullable(),
        is_lost_stage: Yup.boolean().nullable(),
      })
    ),
  });

  const crudInitialValues = {
    name: '',
    is_default: false,
    description: '',
    stages: [],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.is_default = Boolean(p.is_default);
    p.stages = Array.isArray(p.stages)
      ? p.stages.map((s) => ({
          ...s,
          name: s.name?.trim() || null,
          color: s.color?.trim() || null,
          probability: s.probability != null ? Number(s.probability) : null,
          sort_order: s.sort_order != null ? Number(s.sort_order) : null,
          is_won_stage: Boolean(s.is_won_stage),
          is_lost_stage: Boolean(s.is_lost_stage),
        }))
      : [];
    p.deleted_item_ids = Array.isArray(p.deleted_item_ids) ? p.deleted_item_ids : [];
    Object.keys(p).forEach((k) => {
      if (p[k] === '' && k !== 'stages' && k !== 'deleted_item_ids') p[k] = null;
    });
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Deal Pipelines" />
      <ReusableCrud
        icon={<NodeIndexOutlined />}
        title="Deal Pipelines"
        apiUrl={api('/api/crm/deal-pipelines/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1100}
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
