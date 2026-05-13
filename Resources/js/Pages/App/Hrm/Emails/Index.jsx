import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const STATUS_COLORS = { SENT: 'green', FAILED: 'red', PENDING: 'orange' };

export default function Emails(props) {
  const { token } = theme.useToken();
  const columns = [
    { title: 'From', dataIndex: 'sender_email', key: 'sender_email', sorter: true, render: (v) => v || '-' },
    { title: 'To', dataIndex: 'receiver_email', key: 'receiver_email', sorter: true, render: (v) => v || '-' },
    { title: 'Subject', dataIndex: 'subject', key: 'subject', sorter: true, render: (v) => v ? <Tooltip title={v}><span style={{ fontWeight: 500 }}>{v.length>60?v.slice(0,60)+'…':v}</span></Tooltip> : '-' },
    { title: 'Status', dataIndex: 'email_status', key: 'email_status', sorter: true, width: 100, render: (v) => <Tag color={STATUS_COLORS[v]||'default'}>{v||'—'}</Tag> },
    { title: 'Branch', key: 'branch', render: (_, r) => r?.branch?.name || '-' },
    { title: 'Sent At', dataIndex: 'created_at', key: 'created_at', sorter: true, width: 110, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'sender_email', label: 'From Email', type: 'email', required: true, col: 12 },
    { name: 'receiver_email', label: 'To Email', type: 'email', required: true, col: 12 },
    { name: 'subject', label: 'Subject', type: 'text', required: true, col: 24 },
    { name: 'body', label: 'Body', type: 'textarea', col: 24, rows: 6 },
    { name: 'email_status', label: 'Status', type: 'select', col: 12, options: ['PENDING','SENT','FAILED'].map(v => ({ label: v, value: v })) },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    sender_email: Yup.string().required('From email is required').email().max(180),
    receiver_email: Yup.string().required('To email is required').email().max(180),
    subject: Yup.string().required('Subject is required').max(255),
    body: Yup.string().nullable(),
    email_status: Yup.string().nullable(),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { sender_email: '', receiver_email: '', subject: '', body: '', email_status: 'PENDING', active: true };
  const transformPayload = (v) => { const p={...v}; p.active=Boolean(p.active); Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null)); return p; };
  const filters = [
    { name: 'email_status', label: 'Status', type: 'select', options: ['PENDING','SENT','FAILED'].map(v => ({ label: v, value: v })) },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Email Logs" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(22,119,255,0.09) 0%, rgba(82,196,26,0.05) 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#1677ff', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <MailOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Email Logs</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Monitor sent, pending, and failed email communications.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud icon={<MailOutlined />} title="Email Log" apiUrl={api('/api/hrm/emails')}
            columns={columns} fields={fields} filters={filters} validationSchema={validationSchema}
            crudInitialValues={initialValues} transformPayload={transformPayload}
            form_ui="drawer" drawerWidth={720}
            searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
            activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
