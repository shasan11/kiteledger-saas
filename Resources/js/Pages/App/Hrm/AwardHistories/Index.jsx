import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;
const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';

export default function AwardHistories(props) {
  const { token } = theme.useToken();
  const columns = [
    { title: 'Employee', key: 'user', width: 170, render: (_, r) => { const u=r.user; return u ? <strong>{[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username}</strong> : '-'; } },
    { title: 'Award', key: 'award', render: (_, r) => r?.award?.name || r?.award_id_detail?.label || '-' },
    { title: 'Awarded Date', dataIndex: 'awarded_date', key: 'awarded_date', sorter: true, width: 120, render: fmtDate },
    { title: 'Comment', dataIndex: 'comment', key: 'comment', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12 }}>{v.length>60?v.slice(0,60)+'…':v}</span></Tooltip> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'award_id', label: 'Award', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/awards'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
    { name: 'awarded_date', label: 'Awarded Date', type: 'date', required: true, col: 12 },
    { name: 'comment', label: 'Comment', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    award_id: Yup.mixed().required('Award is required'),
    awarded_date: Yup.string().required('Date is required'),
    comment: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { user_id: null, award_id: null, awarded_date: '', comment: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    if (p.user_id&&typeof p.user_id==='object') p.user_id=p.user_id.id??p.user_id.value;
    if (p.award_id&&typeof p.award_id==='object') p.award_id=p.award_id.id??p.award_id.value;
    return p;
  };
  const filters = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'first_name', fkLabel: (r) => r ? [r.first_name,r.last_name].filter(Boolean).join(' ')||r.username : '' },
    { name: 'award_id', label: 'Award', type: 'fkSelect', fkUrl: api('/api/hrm/awards'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name', fkLabel: (r) => r?.name || '' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Award History" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(250,173,20,0.10) 0%, #ffffff 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#faad14', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <TrophyOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Award History</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>View the full history of awards given to employees.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud icon={<TrophyOutlined />} title="Award History" apiUrl={api('/api/hrm/award-histories')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="drawer" drawerWidth={700}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
