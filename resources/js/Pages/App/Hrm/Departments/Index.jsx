import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip } from 'antd';
import { BankOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Departments(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val) => <span style={{ fontWeight: 600 }}>{val}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val) => val
        ? <Tooltip title={val}><span style={{ color: '#555', fontSize: 12 }}>{val.length > 70 ? val.slice(0, 70) + '…' : val}</span></Tooltip>
        : '-',
    },
    {
      title: 'Branch',
      key: 'branch',
      width: 120,
      render: (_, r) => r?.branch?.name || r?.branch_id_detail?.label || '-',
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
    { name: 'name', label: 'Department Name', type: 'text', required: true, col: 24, placeholder: 'e.g. Engineering, Finance' },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Department name is required').max(120),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });

  const initialValues = { name: '', description: '', active: true };

  const transformPayload = (v) => {
    const p = { ...v };
    p.name = p.name?.trim() || null;
    p.description = p.description?.trim() || null;
    p.active = Boolean(p.active);
    Object.keys(p).forEach((k) => p[k] === '' && (p[k] = null));
    return p;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Departments</h2>}>
      <Head title="Departments" />
      <ReusableCrud
        icon={<BankOutlined />}
        title="Department"
        apiUrl={api('/api/hrm/departments')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={initialValues}
        transformPayload={transformPayload}
        form_ui="modal"
        modalWidth={600}
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
