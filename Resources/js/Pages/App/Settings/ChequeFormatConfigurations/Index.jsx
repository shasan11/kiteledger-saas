import ReusableCrud from '@/Components/ReusableCrud';
import { Tag } from 'antd';
import * as Yup from 'yup';
import { FileTextOutlined } from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ChequeFormatConfigurations() {
  const columns = [
    { title: 'Country', dataIndex: 'country', key: 'country', sorter: true },
    { title: 'Format Name', dataIndex: 'format_name', key: 'format_name', sorter: true },
    { title: 'Paper Size', dataIndex: 'paper_size', key: 'paper_size', sorter: true, width: 120, render: (value) => value || '-' },
    { title: 'Width', dataIndex: 'width', key: 'width', width: 100, render: (value) => value || '-' },
    { title: 'Height', dataIndex: 'height', key: 'height', width: 100, render: (value) => value || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 100, render: (value) => <Tag color={value === false ? 'default' : 'success'}>{value === false ? 'Inactive' : 'Active'}</Tag> },
  ];

  const fields = [
    { name: 'country', label: 'Country', type: 'text', required: true, col: 12 },
    { name: 'format_name', label: 'Cheque Format Name', type: 'text', required: true, col: 12 },
    { name: 'paper_size', label: 'Paper Size', type: 'select', col: 8, options: ['A4', 'Letter', 'Legal', 'Custom'].map((value) => ({ value, label: value })) },
    { name: 'width', label: 'Width', type: 'number', col: 8, min: 0 },
    { name: 'height', label: 'Height', type: 'number', col: 8, min: 0 },
    { name: 'date_position', label: 'Date Position', type: 'text', col: 12, placeholder: 'x,y or layout key' },
    { name: 'payee_name_position', label: 'Payee Name Position', type: 'text', col: 12, placeholder: 'x,y or layout key' },
    { name: 'amount_number_position', label: 'Amount in Number Position', type: 'text', col: 12, placeholder: 'x,y or layout key' },
    { name: 'amount_words_position', label: 'Amount in Words Position', type: 'text', col: 12, placeholder: 'x,y or layout key' },
    { name: 'signature_position', label: 'Signature Position', type: 'text', col: 12, placeholder: 'x,y or layout key' },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
  ];

  const validationSchema = Yup.object().shape({
    country: Yup.string().trim().max(100).required('Country is required'),
    format_name: Yup.string().trim().max(150).required('Cheque format name is required'),
    paper_size: Yup.string().nullable().max(50),
    width: Yup.number().nullable().min(0),
    height: Yup.number().nullable().min(0),
    date_position: Yup.string().nullable().max(120),
    payee_name_position: Yup.string().nullable().max(120),
    amount_number_position: Yup.string().nullable().max(120),
    amount_words_position: Yup.string().nullable().max(120),
    signature_position: Yup.string().nullable().max(120),
    active: Yup.boolean().nullable(),
  });

  const crudInitialValues = {
    country: '',
    format_name: '',
    paper_size: 'Custom',
    width: null,
    height: null,
    date_position: '',
    payee_name_position: '',
    amount_number_position: '',
    amount_words_position: '',
    signature_position: '',
    active: true,
  };

  const transformPayload = (values) => {
    const payload = { ...values, active: values.active !== false };
    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === 'string') payload[key] = payload[key].trim() || null;
    });
    return payload;
  };

  return (
    <ReusableCrud
      icon={<FileTextOutlined />}
      title="Cheque Format Configuration"
      apiUrl={api('/api/cheque-format-configurations/')}
      columns={columns}
      fields={fields}
      validationSchema={validationSchema}
      crudInitialValues={crudInitialValues}
      transformPayload={transformPayload}
      form_ui="drawer"
      drawerWidth={720}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      sortMode="ordering"
      orderingParam="ordering"
      enableServerPagination
      showSearch
      canAdd
      canEdit
      canDelete
      hasActions
      hasActionColumns
    />
  );
}
