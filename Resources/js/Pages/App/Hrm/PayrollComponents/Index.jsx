import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import { SettingOutlined } from '@ant-design/icons';

export default function PayrollComponentsIndex() {
  return (
    <AuthenticatedLayout>
      <Head title="Payroll Components" />
      <div style={{ padding: 24 }}>
        <ReusableCrud
          title="Payroll Components"
          icon={<SettingOutlined />}
          apiUrl="/api/hrm/payroll-components"
          form_ui="drawer"
          fields={[
            { name: 'name', label: 'Name', type: 'text', required: true, col: 12 },
            { name: 'code', label: 'Code', type: 'text', required: true, col: 12 },
            { name: 'type', label: 'Type', type: 'select', required: true, col: 12, options: ['earning', 'deduction', 'employer_contribution'].map((value) => ({ value, label: value })) },
            { name: 'calculation_type', label: 'Calculation Type', type: 'select', required: true, col: 12, options: ['fixed', 'percentage', 'manual', 'formula'].map((value) => ({ value, label: value })) },
            { name: 'taxable', label: 'Taxable', type: 'switch', col: 8 },
            { name: 'active', label: 'Active', type: 'switch', col: 8 },
            { name: 'sort_order', label: 'Sort Order', type: 'number', col: 8 },
          ]}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Code', dataIndex: 'code' },
            { title: 'Type', dataIndex: 'type' },
            { title: 'Calculation', dataIndex: 'calculation_type' },
            { title: 'Taxable', dataIndex: 'taxable', render: (value) => value ? 'Yes' : 'No' },
            { title: 'Active', dataIndex: 'active', render: (value) => value !== false ? 'Yes' : 'No' },
          ]}
          crudInitialValues={{ type: 'earning', calculation_type: 'fixed', taxable: false, active: true, sort_order: 0 }}
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
