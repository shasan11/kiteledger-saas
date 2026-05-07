import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Tag } from 'antd';
import SimpleSettingsCrud from './SimpleSettingsCrud';

export default function ApprovalWorkflows({ auth }) {
  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Approval Workflows" />
      <div style={{ padding: 18 }}>
        <Card title="Approval Workflows" style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/approval-workflows"
            columns={[
              { title: 'Module', dataIndex: 'module' },
              { title: 'Document Type', dataIndex: 'document_type' },
              { title: 'Required', dataIndex: 'approval_required', type: 'boolean' },
              { title: 'Mode', dataIndex: 'approval_mode' },
              { title: 'Minimum Amount', dataIndex: 'minimum_amount' },
              { title: 'Status', dataIndex: 'active', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
            ]}
            fields={[
              { name: 'module', label: 'Module', rules: [{ required: true }] },
              { name: 'document_type', label: 'Document Type', rules: [{ required: true }] },
              { name: 'approval_required', label: 'Approval Required', type: 'switch' },
              { name: 'approval_mode', label: 'Mode', type: 'select', options: ['SINGLE', 'MULTI_STEP'].map((value) => ({ value })) },
              { name: 'minimum_amount', label: 'Minimum Amount', type: 'number', min: 0 },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ module: '', document_type: '', approval_required: true, approval_mode: 'SINGLE', minimum_amount: null, active: true }}
          />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
