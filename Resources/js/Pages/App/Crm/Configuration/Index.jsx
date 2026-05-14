import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Card, Col, Form, InputNumber, Row, Switch, Typography } from 'antd';
import { api } from '../Shared/crmApi';

export default function Configuration({ auth }) {
  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="CRM Configuration" />
      <Row gutter={[12, 12]} style={{ padding: 16 }}>
        <Col xs={24} lg={8}>
          <Card size="small" title="SLA Rules">
            <Form layout="vertical" initialValues={{ lead_response_sla_hours: 24, activity_overdue_escalation_hours: 24, stuck_deal_days: 14, reminder_before_due_minutes: 60 }}>
              <Form.Item label="Lead response SLA hours" name="lead_response_sla_hours"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Activity escalation hours" name="activity_overdue_escalation_hours"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Stuck deal days" name="stuck_deal_days"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Reminder before due minutes" name="reminder_before_due_minutes"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Email sync enabled"><Switch disabled /></Form.Item>
              <Typography.Text type="secondary">Manual communication logging is active. External sync remains disabled until credentials are configured.</Typography.Text>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <ReusableCrud
            title="Sales Sequences"
            apiUrl={api('/api/crm-sequences/')}
            columns={[{ title: 'Name', dataIndex: 'name' }, { title: 'Target', dataIndex: 'target_type' }, { title: 'Active', dataIndex: 'active', render: (v) => v ? 'Yes' : 'No' }]}
            fields={[{ name: 'name', label: 'Name', type: 'text', required: true, col: 12 }, { name: 'target_type', label: 'Target', type: 'select', col: 6, options: ['lead', 'deal', 'customer'].map((value) => ({ value, label: value })) }, { name: 'active', label: 'Active', type: 'switch', col: 6 }, { name: 'description', label: 'Description', type: 'textarea', col: 24, rows: 2 }]}
            validationSchema={Yup.object({ name: Yup.string().required() })}
            crudInitialValues={{ name: '', target_type: 'lead', active: true }}
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
        </Col>
      </Row>
    </AuthenticatedLayout>
  );
}
