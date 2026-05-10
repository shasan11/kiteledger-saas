import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (p) => `${BACKEND}${p}`;

export default function EmailConfigs(props) {
  const columns = [
    { title: 'Config Name', dataIndex: 'email_config_name', key: 'email_config_name', sorter: true, render: (v) => <strong>{v}</strong> },
    { title: 'Host', dataIndex: 'email_host', key: 'email_host', sorter: true },
    { title: 'Port', dataIndex: 'email_port', key: 'email_port', width: 80 },
    { title: 'Email User', dataIndex: 'email_user', key: 'email_user' },
    { title: 'Branch', key: 'branch', render: (_, r) => r?.branch?.name || '-' },
    { title: 'Status', dataIndex: 'active', key: 'active', width: 80, render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];
  const fields = [
    { name: 'email_config_name', label: 'Config Name', type: 'text', required: true, col: 24 },
    { name: 'email_host', label: 'SMTP Host', type: 'text', required: true, col: 12, placeholder: 'smtp.gmail.com' },
    { name: 'email_port', label: 'Port', type: 'number', required: true, col: 6, min: 1, max: 65535, placeholder: '587' },
    { name: 'email_user', label: 'Email / Username', type: 'text', required: true, col: 12 },
    { name: 'email_pass', label: 'Password', type: 'password', required: true, col: 12, placeholder: 'Leave blank to keep current' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];
  const validationSchema = Yup.object().shape({
    email_config_name: Yup.string().required('Config name is required').max(120),
    email_host: Yup.string().required('Host is required').max(180),
    email_port: Yup.number().required('Port is required').min(1).max(65535),
    email_user: Yup.string().required('Email user is required').max(180),
    email_pass: Yup.string().nullable().max(255),
    active: Yup.boolean().nullable(),
  });
  const initialValues = { email_config_name: '', email_host: '', email_port: 587, email_user: '', email_pass: '', active: true };
  const transformPayload = (v) => {
    const p={...v}; p.active=Boolean(p.active);
    if (!p.email_pass) delete p.email_pass;
    Object.keys(p).forEach(k=>p[k]===''&&(p[k]=null));
    return p;
  };
  return (
    <AuthenticatedLayout user={props.auth?.user} header={<h2 className="text-xl font-semibold">Email Configurations</h2>}>
      <Head title="Email Configs" />
      <ReusableCrud icon={<MailOutlined />} title="Email Config" apiUrl={api('/api/hrm/email-configs')}
        columns={columns} fields={fields} validationSchema={validationSchema}
        crudInitialValues={initialValues} transformPayload={transformPayload}
        form_ui="drawer" drawerWidth={700}
        searchParam="search" pageParam="page" pageSizeParam="page_size" sortMode="ordering" orderingParam="ordering"
        activeParam="active" enableServerPagination enableInactiveDrawer showSearch canAdd canEdit canDelete hasActions hasActionColumns />
    </AuthenticatedLayout>
  );
}
