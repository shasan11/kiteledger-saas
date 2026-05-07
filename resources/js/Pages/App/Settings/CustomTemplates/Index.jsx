import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import SimpleSettingsCrud from '../SimpleSettingsCrud';

export default function CustomTemplates(props) {
  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Custom Templates" />
      <div style={{ padding: 18 }}>
        <Card title={<><FileTextOutlined /> Custom Templates</>} style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/custom-templates"
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Purpose', dataIndex: 'purpose' },
              { title: 'Key', dataIndex: 'template_key' },
            ]}
            fields={[
              { name: 'name', label: 'Name', rules: [{ required: true }] },
              { name: 'purpose', label: 'Purpose' },
              { name: 'template_key', label: 'Template Key' },
              { name: 'content', label: 'Content', type: 'richtext' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ name: '', purpose: '', template_key: '', content: '', active: true }}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
