import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Space, Tag, Typography, theme } from 'antd';
import { SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
import dayjs from 'dayjs';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

const fmtDate = (v) => v ? dayjs(v).format('DD MMM YYYY') : '-';

export default function EmployeeDocuments(props) {
  const { token } = theme.useToken();
  const columns = [
    {
      title: 'Employee', key: 'employee', render: (_, r) => {
        const u = r.user;
        if (!u) return '-';
        return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '-';
      },
    },
    { title: 'Title', dataIndex: 'title', render: (v) => <strong>{v}</strong> },
    { title: 'Type', dataIndex: 'document_type', render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: 'Issued', dataIndex: 'issue_date', render: fmtDate, width: 110 },
    {
      title: 'Expires', dataIndex: 'expiry_date', width: 130,
      render: (v) => {
        if (!v) return '-';
        const d = dayjs(v);
        const expired = d.isBefore(dayjs());
        const soon    = !expired && d.diff(dayjs(), 'day') <= 30;
        return (
          <Tag color={expired ? 'red' : soon ? 'orange' : 'default'} icon={expired || soon ? <WarningOutlined /> : null}>
            {fmtDate(v)}
          </Tag>
        );
      },
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
    { name: 'title', label: 'Title', type: 'text', required: true, col: 12 },
    { name: 'document_type', label: 'Document Type', type: 'text', col: 12, placeholder: 'e.g. Passport, NID, Certificate' },
    { name: 'file_path', label: 'File URL / Path', type: 'text', col: 12 },
    { name: 'issue_date',  label: 'Issue Date',  type: 'date', col: 12 },
    { name: 'expiry_date', label: 'Expiry Date', type: 'date', col: 12 },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    user_id: Yup.mixed().required('Employee is required'),
    title:   Yup.string().required('Title is required').max(180),
  });

  const filters = [
    {
      name: 'user_id', label: 'Employee', type: 'fkSelect',
      fkUrl: api('/api/hrm/users'), fkSearchParam: 'search', fkPageSize: 20,
      fkValueKey: 'id', fkLabelKey: 'name',
      fkLabel: (r) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || r?.username || '',
    },
    { name: 'document_type', label: 'Document Type', type: 'text' },
  ];

  return (
    <AuthenticatedLayout auth={props.auth}>
      <Head title="Employee Documents" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(22,119,255,0.09) 0%, rgba(19,194,194,0.05) 100%)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }} styles={{ body: { padding: '20px 24px' } }}>
            <Space size={14} align="center">
              <span style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#1677ff', color: '#ffffff', fontSize: 20, flexShrink: 0 }}>
                <SafetyCertificateOutlined />
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: '#10233f' }}>Employee Documents</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Manage employee documents, certificates, and file references.</Text>
              </div>
            </Space>
          </Card>
          <ReusableCrud
            icon={<SafetyCertificateOutlined />}
            title="Employee Document"
            apiUrl={api('/api/hrm/employee-documents')}
            columns={columns}
            fields={fields}
            validationSchema={validationSchema}
            crudInitialValues={{ user_id: null, title: '', document_type: '', file_path: '', issue_date: '', expiry_date: '', notes: '', active: true }}
            filters={filters}
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
