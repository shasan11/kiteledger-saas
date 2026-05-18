import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Space, Tag } from 'antd';
import SimpleSettingsCrud from './SimpleSettingsCrud';

const fmtDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function FiscalYears({ auth }) {
  return (
    <>
      <Head title="Fiscal Years" />
      <div style={{ padding: 18 }}>
        <Card title="Fiscal Years" style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/fiscal-years"
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Code', dataIndex: 'code' },
              { title: 'Start Date', dataIndex: 'start_date', render: fmtDate },
              { title: 'End Date', dataIndex: 'end_date', render: fmtDate },
              { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : v === 'CLOSED' ? 'red' : 'blue'}>{v}</Tag> },
              { title: 'Current', dataIndex: 'is_current', type: 'boolean' },
            ]}
            fields={[
              { name: 'name', label: 'Name', rules: [{ required: true }] },
              { name: 'code', label: 'Code' },
              { name: 'start_date', label: 'Start Date', type: 'date', rules: [{ required: true }] },
              { name: 'end_date', label: 'End Date', type: 'date', rules: [{ required: true }] },
              { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE', 'CLOSED'].map((value) => ({ value })) },
              { name: 'lock_date', label: 'Lock Date', type: 'date' },
              { name: 'is_current', label: 'Current', type: 'switch' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ name: '', code: '', start_date: '', end_date: '', status: 'DRAFT', lock_date: '', is_current: false, active: true }}
          />
        </Card>
      </div>
    </>
  );
}
