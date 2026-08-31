import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Card, Form, Input, Modal, Space, Tag, message } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import SimpleSettingsCrud from './SimpleSettingsCrud';

const fmtDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const errorMessage = (error) => {
  const payload = error?.response?.data;
  if (payload?.errors) return Object.values(payload.errors).flat()[0];
  return payload?.message || 'The fiscal-year operation failed.';
};

export default function FiscalYears() {
  const [criticalAction, setCriticalAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [criticalForm] = Form.useForm();

  const openCriticalAction = (action, record, reload) => {
    criticalForm.resetFields();
    setCriticalAction({ action, record, reload });
  };

  const submitCriticalAction = async (values) => {
    const { action, record, reload } = criticalAction;
    setSubmitting(true);
    try {
      await axios.post(`/api/fiscal-years/${record.id}/${action}`, values);
      message.success(`Fiscal year ${action === 'close' ? 'closed' : 'reopened'}.`);
      setCriticalAction(null);
      await reload();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const markCurrent = (record, reload) => Modal.confirm({
    title: `Make ${record.name} the current fiscal year?`,
    content: 'The previously active fiscal year will return to draft status.',
    okText: 'Mark current',
    onOk: async () => {
      try {
        await axios.post(`/api/fiscal-years/${record.id}/mark-current`);
        message.success('Current fiscal year updated.');
        await reload();
      } catch (error) {
        message.error(errorMessage(error));
      }
    },
  });

  const renderRowActions = (record, { reload }) => (
    <Space wrap>
      {record.status !== 'CLOSED' && !record.is_current && (
        <Button size="small" onClick={() => markCurrent(record, reload)}>Mark current</Button>
      )}
      {record.status !== 'CLOSED' ? (
        <Button danger size="small" onClick={() => openCriticalAction('close', record, reload)}>Close</Button>
      ) : (
        <Button size="small" onClick={() => openCriticalAction('reopen', record, reload)}>Reopen</Button>
      )}
    </Space>
  );

  const phrase = criticalAction
    ? `${criticalAction.action.toUpperCase()} ${criticalAction.record.code || criticalAction.record.name}`
    : '';

  return (
    <AuthenticatedLayout>
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
              { title: 'Status', dataIndex: 'status', render: (value) => <Tag color={value === 'ACTIVE' ? 'green' : value === 'CLOSED' ? 'red' : 'blue'}>{value}</Tag> },
              { title: 'Current', dataIndex: 'is_current', type: 'boolean' },
            ]}
            fields={[
              { name: 'name', label: 'Name', rules: [{ required: true }] },
              { name: 'code', label: 'Code' },
              { name: 'start_date', label: 'Start Date', type: 'date', rules: [{ required: true }] },
              { name: 'end_date', label: 'End Date', type: 'date', rules: [{ required: true }] },
              { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE'].map((value) => ({ value })) },
              { name: 'lock_date', label: 'Lock Date', type: 'date' },
              { name: 'is_current', label: 'Current', type: 'switch' },
              { name: 'active', label: 'Active', type: 'switch' },
            ]}
            initialValues={{ name: '', code: '', start_date: '', end_date: '', status: 'DRAFT', lock_date: '', is_current: false, active: true }}
            canEditRecord={(record) => record.status !== 'CLOSED'}
            renderRowActions={renderRowActions}
          />
        </Card>
      </div>

      <Modal
        open={Boolean(criticalAction)}
        title={`${criticalAction?.action === 'close' ? 'Close' : 'Reopen'} fiscal year`}
        okText={criticalAction?.action === 'close' ? 'Close fiscal year' : 'Reopen fiscal year'}
        okButtonProps={{ danger: criticalAction?.action === 'close', loading: submitting }}
        onCancel={() => setCriticalAction(null)}
        onOk={() => criticalForm.submit()}
        destroyOnHidden
      >
        <p>
          {criticalAction?.action === 'close'
            ? 'Close is blocked while draft financial documents or journal vouchers remain. Closed periods reject normal accounting writes.'
            : 'Reopening unlocks this accounting period. The reason is recorded in the activity log.'}
        </p>
        <Form form={criticalForm} layout="vertical" onFinish={submitCriticalAction}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }, { min: 10 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="current_password" label="Your password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="confirmation"
            label={<>Type <strong>{phrase}</strong> to continue</>}
            rules={[{ required: true }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
