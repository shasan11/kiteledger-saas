import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Tag } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import SimpleSettingsCrud from '../SimpleSettingsCrud';

export default function PrintingTemplates(props) {
  return (
    <>
      <Head title="Printing Templates" />
      <div style={{ padding: 18 }}>
        <Card title={<><PrinterOutlined /> Printing Templates</>} style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/printing-templates"
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Default', dataIndex: 'is_default', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
            ]}
            fields={[
              { name: 'name', label: 'Name', rules: [{ required: true }] },
              { name: 'document_type', label: 'Document Type', hidden: true },
              { name: 'template_key', label: 'Template Key', hidden: true },
              { name: 'is_default', label: 'Default', type: 'switch' },
              { name: 'template_html', label: 'Template HTML', type: 'richtext' },
              { name: 'template_css', label: 'Template CSS', type: 'textarea' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ name: '', document_type: 'general', template_key: '', is_default: false, template_html: '', template_css: '', active: true }}
            formMode="drawer"
            drawerWidth={1100}
          />
        </Card>
      </div>
    </>
  );
}
