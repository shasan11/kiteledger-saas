import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import { TeamOutlined } from '@ant-design/icons';

export default function EmployeePayrollComponentsIndex() {
  return (
    <AuthenticatedLayout>
      <Head title="Employee Payroll Components" />
      <div style={{ padding: 24 }}>
        <ReusableCrud
          title="Employee Payroll Components"
          icon={<TeamOutlined />}
          apiUrl="/api/hrm/employee-payroll-components"
          form_ui="drawer"
          fields={[
            { name: 'employee_id', label: 'Employee', type: 'fkSelect', required: true, col: 12, fkUrl: '/api/hrm/users', fkValueKey: 'id', fkLabelKey: 'name' },
            { name: 'component_id', label: 'Component', type: 'fkSelect', required: true, col: 12, fkUrl: '/api/hrm/payroll-components', fkValueKey: 'id', fkLabelKey: 'name' },
            { name: 'name', label: 'Title', type: 'text', required: true, col: 12 },
            { name: 'amount', label: 'Amount', type: 'number', required: true, col: 12 },
            { name: 'calculation_type', label: 'Calculation', type: 'select', col: 12, options: ['fixed', 'percentage'].map((value) => ({ value, label: value })) },
            { name: 'effective_from', label: 'Effective From', type: 'date', required: true, col: 12 },
            { name: 'effective_to', label: 'Effective To', type: 'date', col: 12 },
            { name: 'active', label: 'Active', type: 'switch', col: 12 },
          ]}
          columns={[
            { title: 'Employee', render: (_, row) => row.employee?.display_name || row.employee?.name || '-' },
            { title: 'Component', render: (_, row) => row.component?.name || '-' },
            { title: 'Title', dataIndex: 'name' },
            { title: 'Amount', dataIndex: 'amount' },
            { title: 'Active', dataIndex: 'active', render: (value) => value !== false ? 'Yes' : 'No' },
          ]}
          crudInitialValues={{ calculation_type: 'fixed', active: true }}
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
