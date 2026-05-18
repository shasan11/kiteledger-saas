import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Card, Tag } from 'antd';
import SimpleSettingsCrud from './SimpleSettingsCrud';

export default function ApprovalWorkflows({ auth }) {
  return (
    <>
      <Head title="Approval Workflows" />
      <div style={{ padding: 18 }}>
        <Card title="Approval Workflows" style={{ borderRadius: 8 }}>
          <SimpleSettingsCrud
            endpoint="/api/approval-workflows"
            columns={[
              { title: 'Workflow Name', key: 'name', render: (_, r) => `${r.module || 'Module'} / ${r.document_type || 'Document'}` },
              { title: 'Module', dataIndex: 'module' },
              { title: 'Document Type', dataIndex: 'document_type' },
              { title: 'Min Amount', dataIndex: 'minimum_amount' },
              { title: 'Max Amount', key: 'max_amount', render: () => '-' },
              { title: 'Approver Role/User', key: 'approver', render: (_, r) => r?.approver_role?.name || r?.approverRole?.name || r?.approver_user?.name || r?.approverUser?.name || '-' },
              { title: 'Step Count', dataIndex: 'steps', render: (v) => Array.isArray(v) ? v.length : 0 },
              { title: 'Status', dataIndex: 'active', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
              { title: 'Updated At', dataIndex: 'updated_at', render: (v) => v ? new Date(v).toLocaleString() : '-' },
            ]}
            fields={[
              { name: 'module', label: 'Module', rules: [{ required: true }] },
              { name: 'document_type', label: 'Document Type', rules: [{ required: true }] },
              { name: 'approval_required', label: 'Approval Required', type: 'switch' },
              { name: 'approval_mode', label: 'Mode', type: 'select', options: ['SINGLE', 'MULTI_STEP'].map((value) => ({ value })) },
              { name: 'minimum_amount', label: 'Minimum Amount', type: 'number', min: 0 },
              { name: 'approver_role_id', label: 'Approver Role ID' },
              { name: 'approver_user_id', label: 'Approver User ID' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ module: '', document_type: '', approval_required: true, approval_mode: 'SINGLE', minimum_amount: null, active: true }}
          />
        </Card>
      </div>
    </>
  );
}
