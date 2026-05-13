import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { DollarOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const fmtDate = (v) => v ? new Date(v).toLocaleDateString() : '-';
const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

export default function SalaryHistories(props) {
  const { token } = theme.useToken();
  const columns = [
    {
      title: 'Employee', key: 'user', width: 180,
      render: (_, r) => {
        const u = r.user;
        return u ? <strong>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</strong> : '-';
      },
    },
    { title: 'Salary', dataIndex: 'salary', key: 'salary', sorter: true, width: 120, render: (v) => <strong style={{ color: '#389e0d' }}>{fmtMoney(v)}</strong> },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', sorter: true, width: 110, render: fmtDate },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', sorter: true, width: 110, render: fmtDate },
    { title: 'Comment', dataIndex: 'comment', key: 'comment', render: (v) => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v.length > 60 ? v.slice(0,60)+'…' : v}</span></Tooltip> : '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
  ];
  const fields = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect', required: true, col: 24,
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '' },
    { name: 'salary', label: 'Salary', type: 'number', required: true, col: 12, min: 0 },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true, col: 12 },
    { name: 'end_date', label: 'End Date', type: 'date', col: 12 },
    { name: 'comment', label: 'Comment', type: 'textarea', col: 24, rows: 2 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    salary: Yup.number().required('Salary is required').min(0),
    start_date: Yup.string().required('Start date is required'),
    end_date: Yup.string().nullable(),
    comment: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { user_id: null, salary: 0, start_date: '', end_date: '', comment: '', active: true };
  const transformPayload = (v) => {
    const p = { ...v }; p.active = Boolean(p.active);
    Object.keys(p).forEach(k => p[k] === '' && (p[k] = null));
    if (p.user_id && typeof p.user_id === 'object') p.user_id = p.user_id.id ?? p.user_id.value;
    return p;
  };
  const filters = [
    { name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'first_name',
      fkLabel: (r) => r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username : '' },
  ];
  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Salary History" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(82,196,26,0.09) 0%, rgba(22,119,255,0.05) 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#52c41a', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <DollarOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Salary History</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>View and manage employee salary records and change history.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud icon={<DollarOutlined />} title="Salary History" apiUrl={api('/api/hrm/salary-histories')}
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
