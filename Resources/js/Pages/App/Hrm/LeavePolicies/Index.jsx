import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Tooltip, Space } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function LeavePolicies(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true, render: (v) => <strong>{v}</strong> },
    {
      title: 'Paid Leaves', dataIndex: 'paid_leave_count', key: 'paid_leave_count', sorter: true, width: 110,
      render: (v) => <Tag color="green">{v ?? 0} days</Tag>,
    },
    {
      title: 'Unpaid Leaves', dataIndex: 'unpaid_leave_count', key: 'unpaid_leave_count', sorter: true, width: 120,
      render: (v) => <Tag color="orange">{v ?? 0} days</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v.length > 60 ? v.slice(0,60)+'…' : v}</span></Tooltip> : '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'name', label: 'Policy Name', type: 'text', required: true, col: 24 },
    { name: 'paid_leave_count', label: 'Paid Leave Days', type: 'number', required: true, col: 12, min: 0 },
    { name: 'unpaid_leave_count', label: 'Unpaid Leave Days', type: 'number', required: true, col: 12, min: 0 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Policy name is required').max(120),
    paid_leave_count: Yup.number().required('Required').min(0),
    unpaid_leave_count: Yup.number().required('Required').min(0),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', paid_leave_count: 0, unpaid_leave_count: 0, description: '', active: true };
  const transformPayload = (v) => { const p={...v}; p.name=p.name?.trim()||null; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null)); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Leave Policies</h2>}>
      <Head title="Leave Policies" />
      <ReusableCrud icon={<FileProtectOutlined />} title="Leave Policy" apiUrl={api('/api/hrm/leave-policies')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={680}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
