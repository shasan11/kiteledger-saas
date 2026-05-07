import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Space, Tag } from 'antd';
import SimpleSettingsCrud from './SimpleSettingsCrud';

export default function FiscalYears({ auth }) {
  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Fiscal Years" />
      <div style={{ padding: 18 }}>
        <Card title="Fiscal Years" style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/fiscal-years"
            columns={[
              { title: 'Name', dataIndex: 'name' },
              { title: 'Code', dataIndex: 'code' },
              { title: 'Start', dataIndex: 'start_date' },
              { title: 'End', dataIndex: 'end_date' },
              { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : v === 'CLOSED' ? 'red' : 'blue'}>{v}</Tag> },
              { title: 'Current', dataIndex: 'is_current', type: 'boolean' },
            ]}
            fields={[
              { name: 'name', label: 'Name', rules: [{ required: true }] },
              { name: 'code', label: 'Code' },
              { name: 'start_date', label: 'Start Date', rules: [{ required: true }] },
              { name: 'end_date', label: 'End Date', rules: [{ required: true }] },
              { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE', 'CLOSED'].map((value) => ({ value })) },
              { name: 'lock_date', label: 'Lock Date' },
              { name: 'is_current', label: 'Current', type: 'switch' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ name: '', code: '', start_date: '', end_date: '', status: 'DRAFT', lock_date: '', is_current: false, active: true }}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
