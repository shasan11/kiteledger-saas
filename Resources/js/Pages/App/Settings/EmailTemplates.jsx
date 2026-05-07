import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Tag } from 'antd';
import SimpleSettingsCrud from './SimpleSettingsCrud';

export default function EmailTemplates({ auth }) {
  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Email Templates" />
      <div style={{ padding: 18 }}>
        <Card title="Email Templates" style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/email-templates"
            columns={[
              { title: 'Module', dataIndex: 'module' },
              { title: 'Key', dataIndex: 'template_key' },
              { title: 'Subject', dataIndex: 'subject' },
              { title: 'Active', dataIndex: 'active', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
            ]}
            fields={[
              { name: 'module', label: 'Module', rules: [{ required: true }] },
              { name: 'template_key', label: 'Template Key', rules: [{ required: true }] },
              { name: 'subject', label: 'Subject', rules: [{ required: true }] },
              { name: 'body', label: 'Body', type: 'textarea' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ module: '', template_key: '', subject: '', body: '', active: true }}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
