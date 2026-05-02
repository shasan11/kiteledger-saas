import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Avatar } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function Awards(props) {
  const columns = [
    {
      title: 'Award', key: 'award', width: 260,
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {r.image
            ? <Avatar src={`${BACKEND}${r.image}`} shape="square" size={36} />
            : <Avatar shape="square" size={36} style={{ background: '#f5a623', fontSize: 18 }}>🏆</Avatar>}
          <strong>{r.name}</strong>
        </div>
      ),
    },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v ? <span style={{ fontSize: 12, color: '#555' }}>{v.length > 70 ? v.slice(0,70)+'…' : v}</span> : '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', sorter: true, width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  ];
  const fields = [
    { name: 'name', label: 'Award Name', type: 'text', required: true, col: 24 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 3 },
    { name: 'image', label: 'Image', type: 'upload', col: 24, accept: 'image/*' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Award name is required').max(150),
    description: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { name: '', description: '', image: null, active: true };
  const transformPayload = (v) => { const p={...v}; p.name=p.name?.trim()||null; p.active=Boolean(p.active); return p; };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Awards</h2>}>
      <Head title="Awards" />
      <ReusableCrud icon={<TrophyOutlined />} title="Award" apiUrl={api('/api/hrm/awards')}
        columns={columns} fields={fields} validationSchema={validationSchema} crudInitialValues={initialValues}
        transformPayload={transformPayload} form_ui="modal" modalWidth={600}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
