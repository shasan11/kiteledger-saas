import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function EmploymentStatuses(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val, record) => (
        <Tag
          color={record.colour_value || 'default'}
          style={{ fontWeight: 600, fontSize: 12, border: `1px solid ${record.colour_value || '#d9d9d9'}` }}
        >
          {val}
        </Tag>
      ),
    },
    {
      title: 'Colour',
      dataIndex: 'colour_value',
      key: 'colour_value',
      width: 80,
      render: (val) => val ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: val, display: 'inline-block', border: '1px solid #eee' }} />
          <span style={{ fontSize: 11, color: '#888' }}>{val}</span>
        </div>
      ) : '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val) => val ? <Tooltip title={val}><span style={{ color: '#555', fontSize: 12 }}>{val.length > 60 ? val.slice(0, 60) + '…' : val}</span></Tooltip> : '-',
    },
    {
      title: 'System',
      dataIndex: 'is_system_generated',
      key: 'is_system_generated',
      width: 80,
      render: (v) => v ? <Tag color="blue" style={{ fontSize: 11 }}>System</Tag> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      sorter: true,
      width: 80,
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      width: 110,
      render: (v) => v ? new Date(v).toLocaleDateString() : '-',
    },
  ];

  const fields = [
    {
      label: 'Basic Info',
      type: 'section',
      children: [
        { name: 'name', label: 'Status Name', type: 'text', required: true, col: 12, placeholder: 'e.g. Active, Probation' },
        { name: 'colour_value', label: 'Colour', type: 'color', col: 12 },
        { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2, placeholder: 'Optional description' },
      ],
    },
    {
      label: 'Settings',
      type: 'section',
      children: [
        { name: 'active', label: 'Active', type: 'switch', col: 12 },
        { name: 'is_system_generated', label: 'System Generated', type: 'switch', col: 12, disabled: true },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Status name is required').max(120),
    colour_value: Yup.string().required('Colour is required').max(30),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });

  const initialValues = { name: '', colour_value: '#1677ff', description: '', active: true, is_system_generated: false };

  const transformPayload = (v) => {
    const p = { ...v };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Employment Statuses</h2>}>
      <Head title="Employment Statuses" />
      <ReusableCrud
        icon={<IdcardOutlined />}
        title="Employment Status"
        apiUrl={api('/api/hrm/employment-statuses')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={680}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination
        enableInactiveDrawer
        showSearch
        canAdd canEdit canDelete hasActions hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
