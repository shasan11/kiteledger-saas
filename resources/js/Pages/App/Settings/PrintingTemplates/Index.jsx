import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function PrintingTemplates(props) {
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
    { title: 'Document Type', dataIndex: 'document_type', key: 'document_type', sorter: true },
    {
      title: 'Default',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (val) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'document_type', label: 'Document Type', type: 'text' },
    { name: 'is_default', label: 'Default', type: 'switch' },
    { name: 'template_html', label: 'Template HTML', type: 'textarea' },
    { name: 'template_css', label: 'Template CSS', type: 'textarea' },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    document_type: Yup.string().nullable(),
    is_default: Yup.boolean().nullable(),
    template_html: Yup.string().nullable(),
    template_css: Yup.string().nullable(),
  });

  const crudInitialValues = {
    name: '',
    document_type: '',
    is_default: false,
    template_html: '',
    template_css: '',
  };

  const transformPayload = (values) => {
    const payload = { ...values };
    payload.name = payload.name?.trim() || null;
    payload.is_default = Boolean(payload.is_default);
    Object.keys(payload).forEach((key) => payload[key] === '' && (payload[key] = null));
    return payload;
  };

  return (
    <AuthenticatedLayout user={props.auth?.user}>
      <Head title="Printing Templates" />
      <ReusableCrud
        icon={<PrinterOutlined />}
        title="Printing Templates"
        apiUrl={api('/api/printing-templates/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={900}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}
