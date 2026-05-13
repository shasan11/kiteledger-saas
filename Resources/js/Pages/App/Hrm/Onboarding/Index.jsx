import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Typography, theme } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
import dayjs from 'dayjs';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const STATUS_COLORS = { PENDING: 'gold', IN_PROGRESS: 'blue', COMPLETED: 'green', SKIPPED: 'default' };
const fmtDate = (v) => v ? dayjs(v).format('DD MMM YYYY') : '-';

export default function OnboardingIndex(props) {
  const { token } = theme.useToken();
  const columns = [
    {
      title: 'Employee', key: 'employee', render: (_, r) => {
        const u = r.user;
        return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '-' : '-';
      },
    },
    { title: 'Type', dataIndex: 'type', width: 120, render: (v) => <Tag color={v === 'ONBOARDING' ? 'blue' : 'volcano'}>{v}</Tag> },
    { title: 'Task', dataIndex: 'title', render: (v) => <strong>{v}</strong> },
    { title: 'Due', dataIndex: 'due_date', width: 110, render: fmtDate },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{String(v || '').replace(/_/g, ' ')}</Tag>,
    },
    { title: 'Active', dataIndex: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  const fields = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 12,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name',
      fkLabel: (r) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.username || '',
    },
    {
      name: 'type', label: 'Type', type: 'select', required: true, col: 12,
      options: [{ label: 'Onboarding', value: 'ONBOARDING' }, { label: 'Offboarding', value: 'OFFBOARDING' }],
    },
    { name: 'title', label: 'Task Title', type: 'text', required: true, col: 24 },
    { name: 'description', label: 'Description', type: 'textarea', col: 24 },
    { name: 'due_date',    label: 'Due Date',     type: 'date', col: 12 },
    { name: 'completed_at', label: 'Completed At', type: 'date', col: 12 },
    {
      name: 'status', label: 'Status', type: 'select', col: 12,
      options: ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED'].map(v => ({ label: v.replace(/_/g,' '), value: v })),
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    type:    Yup.string().required('Type is required'),
    title:   Yup.string().required('Title is required').max(180),
  });

  const filters = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name',
      fkLabel: (r) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.username || '',
    },
    { name: 'type', label: 'Type', type: 'select',
      options: [{ label: 'Onboarding', value: 'ONBOARDING' }, { label: 'Offboarding', value: 'OFFBOARDING' }] },
    { name: 'status', label: 'Status', type: 'select',
      options: ['PENDING','IN_PROGRESS','COMPLETED','SKIPPED'].map(v => ({ label: v.replace(/_/g,' '), value: v })) },
  ];

  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Onboarding & Offboarding" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(82,196,26,0.09) 0%, rgba(22,119,255,0.05) 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#52c41a', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <CheckCircleOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Onboarding & Offboarding</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Manage onboarding and offboarding checklists for employees.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud
            icon={<CheckCircleOutlined />}
            title="Checklist Item"
            apiUrl={api('/api/hrm/onboarding-checklists')}
            columns={columns}
            fields={fields}
            validationSchema={validationSchema}
            crudInitialValues={{ user_id: null, type: 'ONBOARDING', title: '', description: '', due_date: '', completed_at: '', status: 'PENDING', notes: '', active: true }}
            filters={filters}
            anchorFilters={[
              { label: 'Onboarding',   key: 'ONBOARDING',   paramKey: 'type' },
              { label: 'Offboarding',  key: 'OFFBOARDING',  paramKey: 'type' },
              { label: 'All',          key: 'all' },
            ]}
            defaultAnchorKey="ONBOARDING"
            form_ui="modal"
            modalWidth={700}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            activeParam="active"
            enableServerPagination
            enableInactiveDrawer
            showSearch
            canAdd canEdit canDelete hasActions hasActionColumns
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
