import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import { FileDoneOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function PayrollPeriodsIndex() {
  return (
    <AuthenticatedLayout>
      <Head title="Payroll Periods" />
      <div style={{ padding: 24 }}>
        <ReusableCrud
          title="Payroll Periods"
          icon={<FileDoneOutlined />}
          apiUrl="/api/hrm/payroll-periods"
          form_ui="drawer"
          fields={[
            { name: 'month', label: 'Month', type: 'select', required: true, col: 12, options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: dayjs().month(i).format('MMMM') })) },
            { name: 'year', label: 'Year', type: 'number', required: true, col: 12 },
            { name: 'start_date', label: 'Start Date', type: 'date', required: true, col: 12 },
            { name: 'end_date', label: 'End Date', type: 'date', required: true, col: 12 },
            { name: 'branch_id', label: 'Branch', type: 'fkSelect', col: 12, fkUrl: '/api/branches', fkValueKey: 'id', fkLabelKey: 'name' },
            { name: 'status', label: 'Status', type: 'select', col: 12, options: ['open', 'processing', 'closed', 'locked'].map((value) => ({ value, label: value })) },
          ]}
          columns={[
            { title: 'Period', dataIndex: 'name' },
            { title: 'Start', dataIndex: 'start_date' },
            { title: 'End', dataIndex: 'end_date' },
            { title: 'Branch', render: (_, row) => row.branch?.name || 'All branches' },
            { title: 'Status', dataIndex: 'status' },
          ]}
          crudInitialValues={{ status: 'open', year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}
          showSearch
          canAdd
          canEdit
          canDelete
          hasActions
          hasActionColumns
        />
      </div>
    </AuthenticatedLayout>
  );
}
