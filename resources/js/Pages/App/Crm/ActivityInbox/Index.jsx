import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button, Card, Drawer, Form, Input, Segmented, Space, Table, message } from 'antd';
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { CrmPage, SmallTag } from '../Shared/CrmWidgets';
import { dateText, getJson, postJson, rowsFrom } from '../Shared/crmApi';

export default function ActivityInbox({ auth }) {
  const [bucket, setBucket] = useState('today');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    getJson('/api/crm/activities/inbox', { bucket })
      .then((data) => setRows(rowsFrom(data)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [bucket]);

  const complete = async (record) => {
    await postJson(`/api/crm/activities/${record.id}/complete`);
    message.success('Activity completed');
    load();
  };

  const reschedule = async () => {
    await postJson(`/api/crm/activities/${selected.id}/reschedule`, form.getFieldsValue());
    message.success('Activity rescheduled');
    setSelected(null);
    load();
  };

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Activity Inbox" />
      <CrmPage title="Activity Inbox" extra={<Segmented value={bucket} onChange={setBucket} options={[{ label: 'Due Today', value: 'today' }, { label: 'Overdue', value: 'overdue' }, { label: 'Upcoming', value: 'upcoming' }]} />}>
        <Card size="small">
          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={rows}
            pagination={{ pageSize: 15 }}
            columns={[
              { title: 'Task', dataIndex: 'subject', render: (value, row) => <><b>{value}</b><br />{row.contact?.name || row.lead?.name || row.deal?.title || '-'}</> },
              { title: 'Type', dataIndex: 'activity_type', width: 120, render: (value) => <SmallTag value={value} /> },
              { title: 'Priority', dataIndex: 'priority', width: 120, render: (value) => <SmallTag value={value} /> },
              { title: 'Due', dataIndex: 'due_at', width: 150, render: dateText },
              { title: 'Owner', render: (_, row) => row.assigned_to?.name || row.assignedTo?.name || '-' },
              { title: 'Actions', width: 180, render: (_, row) => <Space><Button size="small" icon={<CheckOutlined />} onClick={() => complete(row)}>Done</Button><Button size="small" icon={<ClockCircleOutlined />} onClick={() => { setSelected(row); form.setFieldsValue({ due_at: row.due_at }); }}>Reschedule</Button></Space> },
            ]}
          />
        </Card>
        <Drawer title="Reschedule Activity" open={!!selected} onClose={() => setSelected(null)} extra={<Button type="primary" onClick={reschedule}>Save</Button>}>
          <Form form={form} layout="vertical">
            <Form.Item name="due_at" label="Due At" rules={[{ required: true }]}>
              <Input placeholder="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item name="reminder_at" label="Reminder At">
              <Input placeholder="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item name="reason" label="Reason">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Drawer>
      </CrmPage>
    </AuthenticatedLayout>
  );
}
