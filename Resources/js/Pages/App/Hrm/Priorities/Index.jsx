import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { FlagOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Priorities(props) {
  const columns = [
    {
      title: 'Priority', key: 'priority', render: (_, r) => (
        <Tag color={r.colour_value || 'default'} style={{ fontWeight: 600, border: `1px solid ${r.colour_value || '#d9d9d9'}` }}>
          {r.name}
        </Tag>
      ),
    },
    {
      title: 'Colour', dataIndex: 'colour_value', key: 'colour_value', width: 90,
      render: (v) => v ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: v, display: 'inline-block', border: '1px solid #eee' }} />
          <span style={{ fontSize: 11, color: '#888' }}>{v}</span>
        </div>
      ) : '-',
    },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'name', label: 'Priority Name', type: 'text', required: true, col: 12, placeholder: 'e.g. High, Critical' },
    { name: 'colour_value', label: 'Colour', type: 'color', required: true, col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Priority name is required').max(100),
    colour_value: Yup.string().required('Colour is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', colour_value: '#ff4d4f', active: true };
  const transformPayload = (v) => { const p={...v}; p.active=Boolean(p.active); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Priorities</h2>}>
      <Head title="Priorities" />
      <ReusableCrud icon={<FlagOutlined />} title="Priority" apiUrl={api('/api/hrm/priorities')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={560}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
