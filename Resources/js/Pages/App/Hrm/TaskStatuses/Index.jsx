import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Typography, theme } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function TaskStatuses(props) {
  const { token } = theme.useToken();
  const columns = [
    { title: 'Project', key: 'project', render: (_, r) => r?.project?.name || '-' },
    {
      title: 'Status', key: 'status',
      render: (_, r) => <Tag color={r.colour_value || 'default'} style={{ border: `1px solid ${r.colour_value||'#d9d9d9'}`, fontWeight: 600 }}>{r.name}</Tag>,
    },
    { title: 'Colour', dataIndex: 'colour_value', key: 'colour_value', width: 90, render: (v) => v ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: v, display: 'inline-block', border: '1px solid #eee' }} /><span style={{ fontSize: 11, color: '#888' }}>{v}</span></div> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
    { name: 'name', label: 'Status Name', type: 'text', required: true, col: 12 },
    { name: 'colour_value', label: 'Colour', type: 'color', required: true, col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    project_id: Yup.mixed().required('Project is required'),
    name: Yup.string().required('Status name is required').max(100),
    colour_value: Yup.string().required('Colour is required'),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { project_id: null, name: '', colour_value: '#1677ff', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (p.project_id&&typeof p.project_id==='object') p.project_id=p.project_id.id??p.project_id.value;
    return p;
  };
  const filters = [
    { name: 'project_id', label: 'Project', type: 'fkSelect', fkUrl: api('/api/hrm/projects'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name||'' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Task Statuses" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(22,119,255,0.09) 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#1677ff', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <AppstoreOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Task Statuses</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Define custom task statuses and color codes per project.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud icon={<AppstoreOutlined />} title="Task Status" apiUrl={api('/api/hrm/task-statuses')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="modal" modalWidth={600}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
