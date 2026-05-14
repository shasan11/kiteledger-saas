import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Table } from 'antd';
import { useEffect, useState } from 'react';
import { api, getJson, money, rowsFrom } from '../Shared/crmApi';

export default function Campaigns({ auth }) {
  const [roi, setRoi] = useState([]);
  useEffect(() => { getJson('/api/crm/analytics/source-roi').then((data) => setRoi(rowsFrom(data))); }, []);

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Campaign Performance" />
      <Card size="small" title="Source ROI" style={{ margin: 16 }}>
        <Table size="small" rowKey="source" dataSource={roi} pagination={false} columns={[
          { title: 'Source/Campaign', dataIndex: 'source' },
          { title: 'Leads', dataIndex: 'leads' },
          { title: 'Deals', dataIndex: 'deals' },
          { title: 'Revenue', dataIndex: 'revenue', align: 'right', render: money },
          { title: 'Cost', dataIndex: 'cost', align: 'right', render: money },
          { title: 'ROI %', dataIndex: 'roi', align: 'right' },
          { title: 'Cost/Lead', dataIndex: 'cost_per_lead', align: 'right', render: money },
        ]} />
      </Card>
      <ReusableCrud
        title="Campaigns"
        apiUrl={api('/api/crm-campaigns/')}
        columns={[{ title: 'Name', dataIndex: 'name' }, { title: 'Source', dataIndex: 'source' }, { title: 'Medium', dataIndex: 'medium' }, { title: 'Budget', dataIndex: 'budget', render: money }, { title: 'Status', dataIndex: 'status' }]}
        fields={[{ name: 'name', label: 'Name', type: 'text', required: true, col: 12 }, { name: 'code', label: 'Code', type: 'text', col: 6 }, { name: 'status', label: 'Status', type: 'select', col: 6, options: ['draft', 'active', 'paused', 'completed', 'cancelled'].map((value) => ({ value, label: value })) }, { name: 'source', label: 'Source', type: 'text', col: 6 }, { name: 'medium', label: 'Medium', type: 'text', col: 6 }, { name: 'budget', label: 'Budget', type: 'number', col: 6 }, { name: 'start_date', label: 'Start Date', type: 'datePicker', col: 6 }, { name: 'end_date', label: 'End Date', type: 'datePicker', col: 6 }]}
        validationSchema={Yup.object({ name: Yup.string().required() })}
        crudInitialValues={{ name: '', status: 'draft' }}
        transformPayload={(values) => values}
        form_ui="drawer"
        enableServerPagination
        showSearch
        canAdd
        canEdit
        canDelete
        hasActions
        hasActionColumns
      />
    </AuthenticatedLayout>
  );
}
