import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const today = dayjs();

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Cleared', value: 'cleared' },
  { label: 'Bounced', value: 'bounced' },
  { label: 'Cancelled', value: 'cancelled' },
];

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Month', value: 'month' },
  { label: 'All', value: 'all' },
];

const statusColor = {
  pending: 'gold',
  cleared: 'green',
  bounced: 'red',
  cancelled: 'default',
};

const emptyForm = {
  id: null,
  branch_id: null,
  cheque_no: '',
  cheque_date: today,
  payee_name: '',
  account_id: null,
  related_account_id: null,
  amount: 0,
  status: 'pending',
  cleared_date: null,
  exchange_rate: 1,
  approved: false,
  active: true,
  void: false,
  voided_reason: '',
  notes: '',
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateText = (value) => (value ? String(value).slice(0, 10) : '-');

const accountLabel = (row) => {
  const code = row?.code || '';
  const name = row?.display_name || row?.name || row?.label || '';

  return [code, name].filter(Boolean).join(' - ') || String(row?.id || '');
};

const relationLabel = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key];

    if (!value) continue;
    if (typeof value === 'string') return value;

    const label = accountLabel(value);
    if (label) return label;
  }

  return '-';
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
};

const errorText = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === 'string') return data.message;
  if (typeof data === 'string') return data;

  const errors = data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()?.[0];
    if (first) return first;
  }

  return 'Something went wrong.';
};

export default function ChequeRegisters({ auth }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('today');
  const [partyAccount, setPartyAccount] = useState(null);
  const [records, setRecords] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [direction, setDirection] = useState('received');
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        label: accountLabel(account),
        value: account.id,
      })),
    [accounts],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        label: [branch.code, branch.name].filter(Boolean).join(' - ') || branch.name,
        value: branch.id,
      })),
    [branches],
  );

  const loadLookups = useCallback(async () => {
    const [accountRes, branchRes] = await Promise.all([
      axios.get(api('/api/accounts/'), { params: { page_size: 100, active: true } }),
      axios.get(api('/api/branches/'), { params: { page_size: 100, active: true } }).catch(() => ({ data: [] })),
    ]);

    setAccounts(normalizeList(accountRes.data));
    setBranches(normalizeList(branchRes.data));
  }, []);

  const periodParams = useMemo(() => {
    if (period === 'today') {
      const date = today.format('YYYY-MM-DD');
      return { date_from: date, date_to: date };
    }

    if (period === 'month') {
      return {
        date_from: today.startOf('month').format('YYYY-MM-DD'),
        date_to: today.endOf('month').format('YYYY-MM-DD'),
      };
    }

    return {};
  }, [period]);

  const loadRecords = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        page_size: 100,
        ordering: '-cheque_date',
        ...periodParams,
      };

      if (activeTab === 'received' || activeTab === 'issued') {
        params.direction = activeTab;
      }

      if (partyAccount) {
        params.related_account_id = partyAccount;
      }

      const response = await axios.get(api('/api/cheque-registers/'), { params });
      setRecords(normalizeList(response.data));
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [activeTab, partyAccount, periodParams]);

  useEffect(() => {
    loadLookups().catch((error) => message.error(errorText(error)));
  }, [loadLookups]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const dashboardRecords = useMemo(() => records, [records]);
  const receivedRecords = useMemo(
    () => dashboardRecords.filter((record) => record.direction === 'received'),
    [dashboardRecords],
  );
  const issuedRecords = useMemo(
    () => dashboardRecords.filter((record) => record.direction === 'issued'),
    [dashboardRecords],
  );

  const activeRecords = useMemo(() => {
    if (activeTab === 'received') return receivedRecords;
    if (activeTab === 'issued') return issuedRecords;

    return dashboardRecords;
  }, [activeTab, dashboardRecords, issuedRecords, receivedRecords]);

  const stats = useMemo(
    () => ({
      receivedCount: receivedRecords.length,
      issuedCount: issuedRecords.length,
      receivedAmount: receivedRecords.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      issuedAmount: issuedRecords.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    }),
    [issuedRecords, receivedRecords],
  );

  const openCreate = (nextDirection) => {
    setDirection(nextDirection);
    setEditing(null);
    form.setFieldsValue({
      ...emptyForm,
      cheque_date: today,
      status: 'pending',
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setDirection(record.direction || 'received');
    setEditing(record);
    form.setFieldsValue({
      ...emptyForm,
      ...record,
      cheque_date: record.cheque_date ? dayjs(record.cheque_date) : today,
      cleared_date: record.cleared_date ? dayjs(record.cleared_date) : null,
      account_id: record.account_id || record.account?.id || null,
      related_account_id:
        record.related_account_id || record.relatedAccount?.id || record.related_account?.id || null,
      branch_id: record.branch_id || record.branch?.id || null,
      void: Boolean(record.void),
      approved: Boolean(record.approved),
      active: record.active !== false,
    });
    setModalOpen(true);
  };

  const buildPayload = (values) => {
    const chequeDate = values.cheque_date ? values.cheque_date.format('YYYY-MM-DD') : today.format('YYYY-MM-DD');
    const clearedDate = values.cleared_date ? values.cleared_date.format('YYYY-MM-DD') : null;
    const isVoided = Boolean(values.void);

    return {
      branch_id: values.branch_id || null,
      cheque_no: values.cheque_no?.trim() || null,
      cheque_date: chequeDate,
      issued_date: chequeDate,
      received_date: direction === 'received' ? chequeDate : null,
      payee_name: values.payee_name?.trim() || null,
      cleared_date: values.status === 'cleared' ? clearedDate || chequeDate : clearedDate,
      direction,
      account_id: values.account_id || null,
      related_account_id: values.related_account_id || null,
      receiver_related_account_id: direction === 'received' ? values.related_account_id || null : null,
      amount: Number(values.amount || 0),
      status: values.status || 'pending',
      notes: values.notes?.trim() || null,
      active: values.active !== false,
      approved: Boolean(values.approved),
      void: isVoided,
      voided_reason: isVoided ? values.voided_reason?.trim() || null : null,
      voided_at: isVoided ? dayjs().format('YYYY-MM-DD HH:mm:ss') : null,
      exchange_rate: Number(values.exchange_rate || 1),
      total: Number(values.amount || 0) * Number(values.exchange_rate || 1),
    };
  };

  const saveRecord = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values);

      await Yup.object()
        .shape({
          cheque_no: Yup.string().required('Cheque number is required'),
          account_id: Yup.string().required('Cheque account is required'),
          related_account_id: Yup.string().required('Customer/Supplier account is required'),
          amount: Yup.number().min(0.01, 'Amount must be greater than zero').required(),
        })
        .validate(payload);

      if (payload.account_id === payload.related_account_id) {
        message.error('Cheque account and related account cannot be same.');
        return;
      }

      setSaving(true);

      if (editing?.id) {
        await axios.put(api(`/api/cheque-registers/${editing.id}/`), payload);
        message.success('Cheque updated');
      } else {
        await axios.post(api('/api/cheque-registers/'), payload);
        message.success('Cheque created');
      }

      setModalOpen(false);
      await loadRecords();
    } catch (error) {
      if (error?.name === 'ValidationError') {
        message.error(error.message);
      } else if (error?.errorFields) {
        message.error('Please fill the required fields.');
      } else {
        message.error(errorText(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record) => {
    Modal.confirm({
      title: 'Delete cheque?',
      content: `Cheque ${record.cheque_no} will be removed.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await axios.delete(api(`/api/cheque-registers/${record.id}/`));
        message.success('Cheque deleted');
        await loadRecords();
      },
    });
  };

  const columns = [
    {
      title: 'DATE',
      dataIndex: 'cheque_date',
      key: 'cheque_date',
      width: 130,
      render: dateText,
    },
    {
      title: 'CHEQUE NO.',
      dataIndex: 'cheque_no',
      key: 'cheque_no',
      width: 180,
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Tag color={record.direction === 'received' ? 'green' : 'orange'} style={{ marginInlineEnd: 0 }}>
            {record.direction === 'received' ? 'Received' : 'Issued'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'ACCOUNT',
      key: 'account',
      render: (_, record) => relationLabel(record, 'account', 'account_id_detail'),
    },
    {
      title: 'CUSTOMER/SUPPLIER',
      key: 'related_account',
      render: (_, record) =>
        relationLabel(record, 'relatedAccount', 'related_account', 'related_account_id_detail'),
    },
    {
      title: 'AMOUNT',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 140,
      render: (value) => money(value),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value, record) => (
        <Space>
          <Tag color={statusColor[value] || 'default'}>{String(value || 'pending').toUpperCase()}</Tag>
          {record.void ? <Tag color="red">VOID</Tag> : null}
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button danger icon={<DeleteOutlined />} onClick={() => deleteRecord(record)} />
        </Space>
      ),
    },
  ];

  const addMenu = {
    items: [
      { key: 'received', label: 'Cheque Received' },
      { key: 'issued', label: 'Cheque Issued' },
    ],
    onClick: ({ key }) => openCreate(key),
  };

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Cheque Register" />

      <div style={{ minHeight: '100vh', background: '#eaf0f7' }}>
        <div
          style={{
            height: 58,
            background: '#fff',
            borderBottom: '1px solid #dfe6ef',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            padding: '0 16px 0 22px',
          }}
        >
          <Space size={28} align="center">
            <Title level={4} style={{ margin: 0, color: '#061a3a' }}>
              Cheque Register
            </Title>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'received', label: 'Cheque Received' },
                { key: 'issued', label: 'Cheque Issued' },
              ]}
              style={{ height: 58 }}
            />
          </Space>

          <Dropdown menu={addMenu} trigger={['click']}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              style={{ alignSelf: 'center', background: '#12b957', borderRadius: 0, fontWeight: 700 }}
            >
              ADD NEW <DownOutlined />
            </Button>
          </Dropdown>
        </div>

        <div style={{ padding: 16 }}>
          <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 8, marginBottom: 10 }}>
            <Space size={28} wrap>
              <div>
                <Text strong>Period</Text>
                <Select
                  value={period}
                  onChange={setPeriod}
                  options={periodOptions}
                  suffixIcon={<CalendarOutlined />}
                  style={{ display: 'block', width: 190, marginTop: 12 }}
                />
              </div>

              <div>
                <Text strong>Customer/Supplier</Text>
                <Select
                  allowClear
                  showSearch
                  value={partyAccount}
                  onChange={setPartyAccount}
                  options={[{ label: 'All', value: null }, ...accountOptions]}
                  placeholder="All"
                  optionFilterProp="label"
                  style={{ display: 'block', width: 295, marginTop: 12 }}
                />
              </div>
            </Space>
          </Card>

          {activeTab === 'dashboard' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
              <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#10c65a' }}>
                      {money(stats.receivedAmount)}
                    </Title>
                    <Text style={{ color: '#8390a3', fontSize: 18 }}>
                      <Text strong style={{ color: '#0644a3' }}>{stats.receivedCount}</Text> Cheque Received
                    </Text>
                  </div>
                  <Button type="link" onClick={() => openCreate('received')} style={{ fontWeight: 700 }}>
                    + ADD NEW
                  </Button>
                </Space>
                <Button type="link" onClick={() => setActiveTab('received')} style={{ paddingLeft: 0, marginTop: 18, fontWeight: 700 }}>
                  VIEW ALL
                </Button>
              </Card>

              <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#f26a3d' }}>
                      {money(stats.issuedAmount)}
                    </Title>
                    <Text style={{ color: '#8390a3', fontSize: 18 }}>
                      <Text strong style={{ color: '#0644a3' }}>{stats.issuedCount}</Text> Cheque Issued
                    </Text>
                  </div>
                  <Button type="link" onClick={() => openCreate('issued')} style={{ fontWeight: 700 }}>
                    + ADD NEW
                  </Button>
                </Space>
                <Button type="link" onClick={() => setActiveTab('issued')} style={{ paddingLeft: 0, marginTop: 18, fontWeight: 700 }}>
                  VIEW ALL
                </Button>
              </Card>
            </div>
          ) : null}

          <Card
            title={activeTab === 'dashboard' ? 'Cheque Lists' : activeTab === 'received' ? 'Cheque Received' : 'Cheque Issued'}
            bodyStyle={{ padding: 0 }}
            style={{ borderRadius: 8 }}
          >
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={activeRecords}
              pagination={{ pageSize: 15, showSizeChanger: true }}
            />
          </Card>
        </div>
      </div>

      <Modal
        title={`${editing ? 'Edit' : 'Add'} Cheque ${direction === 'received' ? 'Received' : 'Issued'}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={saveRecord}
        okText={editing ? 'Update' : 'Create'}
        confirmLoading={saving}
        width={820}
      >
        <Form form={form} layout="vertical" initialValues={emptyForm}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 16px' }}>
            <Form.Item name="cheque_no" label="Cheque No." rules={[{ required: true, message: 'Cheque number is required' }]}>
              <Input placeholder="Cheque number" />
            </Form.Item>

            <Form.Item name="cheque_date" label="Cheque Date" rules={[{ required: true, message: 'Cheque date is required' }]}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="account_id" label="Cheque Account" rules={[{ required: true, message: 'Cheque account is required' }]}>
              <Select showSearch optionFilterProp="label" options={accountOptions} placeholder="Select bank/cash account" />
            </Form.Item>

            <Form.Item
              name="related_account_id"
              label="Customer/Supplier Account"
              rules={[{ required: true, message: 'Customer/Supplier account is required' }]}
            >
              <Select showSearch optionFilterProp="label" options={accountOptions} placeholder="Select customer/supplier account" />
            </Form.Item>

            <Form.Item name="payee_name" label={direction === 'received' ? 'Received From' : 'Payee Name'}>
              <Input placeholder={direction === 'received' ? 'Received from' : 'Payee name'} />
            </Form.Item>

            <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required' }]}>
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required' }]}>
              <Select options={statusOptions} />
            </Form.Item>

            <Form.Item name="cleared_date" label="Cleared Date">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item name="branch_id" label="Branch">
              <Select allowClear showSearch optionFilterProp="label" options={branchOptions} placeholder="Select branch" />
            </Form.Item>

            <Form.Item name="exchange_rate" label="Exchange Rate">
              <InputNumber min={0.000001} step={0.000001} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="approved" label="Approved">
              <Select
                options={[
                  { label: 'No', value: false },
                  { label: 'Yes', value: true },
                ]}
              />
            </Form.Item>

            <Form.Item name="void" label="Void">
              <Select
                options={[
                  { label: 'No', value: false },
                  { label: 'Yes', value: true },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="voided_reason" label="Void Reason">
            <Input placeholder="Required only when cheque is voided" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Notes" />
          </Form.Item>

          <Space>
            <Tag icon={<BankOutlined />} color={direction === 'received' ? 'green' : 'orange'}>
              {direction === 'received' ? 'Debit cheque account, credit customer/supplier' : 'Debit customer/supplier, credit cheque account'}
            </Tag>
            <Tag icon={<CheckCircleOutlined />} color="blue">
              Posts financially when status is Cleared
            </Tag>
            <Tag icon={<StopOutlined />} color="default">
              Cancelled/Bounced stays non-posted
            </Tag>
          </Space>
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
