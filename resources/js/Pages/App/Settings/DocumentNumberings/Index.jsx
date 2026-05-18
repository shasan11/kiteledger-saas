import { Head } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import SimpleSettingsCrud from '../SimpleSettingsCrud';

const { Text } = Typography;

const labelFor = (value = '') => String(value)
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const previewFor = (record = {}) => {
  const prefix = record.prefix || '';
  const number = String(record.next_number || 1).padStart(Number(record.padding || 6), '0');
  const suffix = record.suffix || '';
  return `${prefix}${number}${suffix}`;
};

export default function DocumentNumberings() {
  return (
    <>
      <Head title="Document Numbering" />
      <div style={{ padding: 12 }}>
        <SimpleSettingsCrud
          endpoint="/api/document-numberings"
          formMode="drawer"
          drawerWidth={720}
          canAdd={false}
          canEdit
          showActions
          editButtonText="Edit"
          drawerTitle="Edit Document Numbering"
          columns={[
            { title: 'Document Type Label', dataIndex: 'document_type', render: (v) => <Text strong>{labelFor(v)}</Text> },
            { title: 'Prefix', dataIndex: 'prefix' },
            { title: 'Next Number', dataIndex: 'next_number' },
            { title: 'Padding', dataIndex: 'padding', render: (v) => v || 6 },
            { title: 'Suffix', dataIndex: 'suffix', render: (v) => v || '-' },
            { title: 'Preview Number', key: 'preview', render: (_, r) => <Text code>{previewFor(r)}</Text> },
            { title: 'Active', dataIndex: 'active', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag> },
            { title: 'Updated At', dataIndex: 'updated_at', render: (v) => v ? new Date(v).toLocaleString() : '-' },
          ]}
          fields={[
            { name: 'document_type', label: 'Document Type', disabled: true },
            { name: 'prefix', label: 'Prefix' },
            { name: 'next_number', label: 'Next Number', type: 'number', min: 1, rules: [{ required: true }] },
            { name: 'padding', label: 'Padding', type: 'number', min: 1, noPayload: true, extra: 'Preview-only: the current database schema does not expose a padding column.' },
            { name: 'suffix', label: 'Suffix', noPayload: true, extra: 'Preview-only: the current database schema does not expose a suffix column.' },
            { name: 'type_of_account', label: 'Numbering Mode', type: 'select', options: [{ value: 'auto_numbering', label: 'Auto Numbering' }, { value: 'manual_numbering', label: 'Manual Numbering' }] },
            { name: 'reset_every_fiscal_year', label: 'Reset Every Fiscal Year', type: 'switch' },
            { name: 'add_fiscal_year_in_code', label: 'Add Fiscal Year In Code', type: 'switch' },
            { name: 'enable_fiscal_year_next_number', label: 'Enable Fiscal Year Next Number', type: 'switch' },
            { name: 'active', label: 'Active', type: 'switch' },
          ]}
          initialValues={{
            document_type: '',
            prefix: '',
            next_number: 1,
            padding: 6,
            suffix: '',
            type_of_account: 'auto_numbering',
            reset_every_fiscal_year: false,
            add_fiscal_year_in_code: false,
            enable_fiscal_year_next_number: false,
            active: true,
          }}
        />
      </div>
    </>
  );
}
