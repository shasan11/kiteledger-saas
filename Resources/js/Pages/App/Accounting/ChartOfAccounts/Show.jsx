import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { App, Button, Card, Col, DatePicker, Descriptions, Drawer, Empty, Form, Input, Row, Space, Switch, Table, Typography, theme } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ChartOfAccountsShow({ id }) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [record, setRecord] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async (params = {}) => {
    setLoading(true);
    try {
      const [recordResponse, ledgerResponse] = await Promise.all([
        axios.get(api(`/api/chart-of-accounts/${id}`)),
        axios.get(api(`/api/chart-of-accounts/${id}/ledger`), { params }),
      ]);
      setRecord(recordResponse.data?.data || recordResponse.data);
      setRows(ledgerResponse.data?.rows || []);
    } catch {
      message.error('Failed to load account ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const createSubAccount = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await axios.post(api('/api/chart-of-accounts'), {
        parent_id: id,
        name: values.name,
        type: record?.type || values.type,
        active: values.active !== false,
        description: values.description || null,
      });
      message.success('Sub account created.');
      setDrawerOpen(false);
      form.resetFields();
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to create sub account.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', width: 120 },
    { title: 'Voucher No', dataIndex: 'voucher_no', width: 150, render: (value, row) => row.journal_voucher_id ? <Link href={route('accounting.journal-vouchers.show', row.journal_voucher_id)}>{value || '-'}</Link> : value || '-' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Debit', dataIndex: 'debit', align: 'right', render: money },
    { title: 'Credit', dataIndex: 'credit', align: 'right', render: money },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: money },
  ];

  return (
    <AuthenticatedLayout header={<Space direction="vertical" size={0}><Title level={4} style={{ margin: 0 }}>{record?.name || 'Chart Of Account'}</Title><Text type="secondary">{record?.code || 'Account ledger'}</Text></Space>}>
      <Head title={record?.name || 'Chart Of Account'} />
      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
        <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('accounting.chart-of-accounts.index'))}>Back</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ active: true }); setDrawerOpen(true); }}>Create Sub Account</Button>
            <RangePicker onChange={(dates) => load({ date_from: dates?.[0]?.format('YYYY-MM-DD'), date_to: dates?.[1]?.format('YYYY-MM-DD') })} />
          </Space>

          <Card bordered={false}>
            <Descriptions size="small" column={{ xs: 1, md: 3 }} items={[
              { key: 'code', label: 'Code', children: record?.code || '-' },
              { key: 'type', label: 'Type', children: record?.type || '-' },
              { key: 'parent', label: 'Parent', children: record?.parent?.name || '-' },
            ]} />
          </Card>

          <Card title="Balance Movement" loading={loading} bordered={false}>
            {rows.length ? (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => money(v)} width={90} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="balance" stroke={token.colorPrimary} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty description="No ledger movement found" />}
          </Card>

          <Card title="Ledger Movements" bordered={false}>
            <Table size="small" rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 900 }} />
          </Card>
        </Space>
      </div>

      <Drawer title="Create Sub Account" open={drawerOpen} onClose={() => setDrawerOpen(false)} width="min(560px, 100vw)" footer={<Space style={{ justifyContent: 'flex-end', width: '100%' }}><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" loading={saving} onClick={createSubAccount}>Save</Button></Space>}>
        <Form form={form} layout="vertical">
          <Form.Item label="Parent Account"><Input value={record?.name || ''} disabled /></Form.Item>
          <Form.Item name="name" label="Account Name" rules={[{ required: true, message: 'Account name is required' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item label="Code"><Input placeholder="Auto-generated" disabled /></Form.Item></Col>
            <Col span={12}><Form.Item label="Type"><Input value={record?.type || ''} disabled /></Form.Item></Col>
          </Row>
          <Form.Item name="active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>
    </AuthenticatedLayout>
  );
}
