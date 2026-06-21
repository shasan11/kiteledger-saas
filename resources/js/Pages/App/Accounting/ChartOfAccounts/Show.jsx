import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { App, Button, Card, Col, DatePicker, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Row, Space, Switch, Table, Tag, Typography, theme } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useMoneyFormatter } from '@/Pages/App/Accounting/Shared/currency';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadBlob = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ChartOfAccountsShow({ id }) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { formatMoney, currency } = useMoneyFormatter();
  const [record, setRecord] = useState(null);
  const [rows, setRows] = useState([]);
  const [subAccounts, setSubAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', date_from: '', date_to: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [form] = Form.useForm();

  const loadLedger = async (params = {}) => {
    setLoading(true);
    try {
      const merged = cleanParams({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
        ...params,
      });
      const ledgerResponse = await axios.get(api(`/api/chart-of-accounts/${id}/ledger`), { params: merged });
      setRows(ledgerResponse.data?.results || ledgerResponse.data?.rows || []);
      setPagination((prev) => ({
        ...prev,
        current: Number(ledgerResponse.data?.page || merged.page || 1),
        pageSize: Number(ledgerResponse.data?.page_size || merged.page_size || prev.pageSize),
        total: Number(ledgerResponse.data?.count || 0),
      }));
    } catch {
      message.error('Failed to load account ledger.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecord = async () => {
    const recordResponse = await axios.get(api(`/api/chart-of-accounts/${id}`));
    setRecord(recordResponse.data?.data || recordResponse.data);
  };

  const loadSubAccounts = async () => {
    setSubLoading(true);
    try {
      const response = await axios.get(api('/api/chart-of-accounts'), {
        params: { parent_id: id, page_size: 100, ordering: 'code' },
      });
      setSubAccounts(response.data?.results || response.data?.data || (Array.isArray(response.data) ? response.data : []));
    } catch {
      message.error('Failed to load sub-accounts.');
    } finally {
      setSubLoading(false);
    }
  };

  const load = async (params = {}) => {
    setLoading(true);
    try {
      await Promise.all([loadRecord(), loadLedger(params), loadSubAccounts()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load({ page: 1 }); }, [id]);

  const openCreate = () => {
    setEditingSubAccount(null);
    form.setFieldsValue({ active: true, name: '', description: '' });
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditingSubAccount(row);
    form.setFieldsValue({ name: row.name, active: row.active !== false, description: row.description || '' });
    setDrawerOpen(true);
  };

  const saveSubAccount = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        parent_id: id,
        name: values.name,
        type: record?.type || values.type,
        active: values.active !== false,
        description: values.description || null,
      };
      if (editingSubAccount) {
        await axios.patch(api(`/api/chart-of-accounts/${editingSubAccount.id}`), payload);
      } else {
        await axios.post(api('/api/chart-of-accounts'), payload);
      }
      message.success(editingSubAccount ? 'Sub-account updated.' : 'Sub-account created.');
      setDrawerOpen(false);
      form.resetFields();
      await Promise.all([loadSubAccounts(), loadRecord()]);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to save sub-account.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSubAccount = async (row) => {
    try {
      await axios.delete(api(`/api/chart-of-accounts/${row.id}`));
      message.success('Sub-account deleted.');
      await loadSubAccounts();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to delete sub-account.');
    }
  };

  const ledgerExportRows = async () => {
    const response = await axios.get(api(`/api/chart-of-accounts/${id}/ledger`), {
      params: cleanParams({ ...filters, page: 1, page_size: 500 }),
    });
    return response.data?.results || response.data?.rows || [];
  };

  const exportCsv = async () => {
    const exportRows = await ledgerExportRows();
    const csv = [
      ['Date', 'Description / Particulars', 'Debit', 'Credit', 'Balance'],
      ...exportRows.map((row) => [row.date, row.description, row.debit, row.credit, row.balance]),
    ].map((line) => line.map(csvEscape).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `${record?.code || 'account'}-ledger.csv`);
  };

  const exportXlsx = async () => {
    const exportRows = await ledgerExportRows();
    const worksheet = XLSX.utils.json_to_sheet(exportRows.map((row) => ({
      Date: row.date,
      'Description / Particulars': row.description,
      Debit: row.debit,
      Credit: row.credit,
      Balance: row.balance,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `${record?.code || 'account'}-ledger.xlsx`);
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', width: 120 },
    { title: 'Description / Particulars', dataIndex: 'description', render: (value) => value || '-' },
    { title: 'Debit', dataIndex: 'debit', align: 'right', render: formatMoney },
    { title: 'Credit', dataIndex: 'credit', align: 'right', render: formatMoney },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: formatMoney },
  ];

  const subColumns = [
    { title: 'Code', dataIndex: 'code', width: 110, render: (value) => value || '-' },
    { title: 'Name', dataIndex: 'name', render: (value, row) => <Link href={route('accounting.chart-of-accounts.show', row.id)}>{value}</Link> },
    { title: 'Type', dataIndex: 'type', width: 110, render: (value) => value || '-' },
    { title: 'Status', dataIndex: 'active', width: 100, render: (value) => <Tag color={value === false ? 'default' : 'success'}>{value === false ? 'Inactive' : 'Active'}</Tag> },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Delete this sub-account?" onConfirm={() => deleteSubAccount(row)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AuthenticatedLayout header={<Space direction="vertical" size={0}><Title level={4} style={{ margin: 0 }}>{record?.name || 'Chart Of Account'}</Title><Text type="secondary">{record?.code || 'Account ledger'}</Text></Space>}>
      <Head title={record?.name || 'Chart Of Account'} />
      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
        <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('accounting.chart-of-accounts.index'))}>Back</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Sub-account</Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadLedger()}>Refresh Ledger</Button>
          </Space>

          <Card bordered={false}>
            <Descriptions size="small" column={{ xs: 1, md: 3 }} items={[
              { key: 'code', label: 'Code', children: record?.code || '-' },
              { key: 'type', label: 'Type', children: record?.type || '-' },
              { key: 'parent', label: 'Parent', children: record?.parent?.name || '-' },
              { key: 'currency', label: 'Currency', children: currency?.code || '-' },
            ]} />
          </Card>

          <Card title="Sub-accounts" bordered={false} extra={<Button size="small" icon={<ReloadOutlined />} onClick={loadSubAccounts}>Refresh</Button>}>
            <Table size="small" rowKey="id" columns={subColumns} dataSource={subAccounts} loading={subLoading} pagination={{ pageSize: 8 }} scroll={{ x: 640 }} />
          </Card>

          <Card title="Balance Movement" loading={loading} bordered={false}>
            {rows.length ? (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => formatMoney(v)} width={110} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Line type="monotone" dataKey="balance" stroke={token.colorPrimary} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty description="No ledger movement found" />}
          </Card>

          <Card
            title="Ledger Movements"
            bordered={false}
            extra={(
              <Space wrap>
                <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={exportXlsx}>Export XLSX</Button>
              </Space>
            )}
          >
            <Space wrap style={{ marginBottom: token.marginSM }}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search particulars..."
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                onPressEnter={() => loadLedger({ page: 1 })}
                style={{ width: 260 }}
              />
              <RangePicker
                onChange={(dates) => {
                  const next = {
                    date_from: dates?.[0]?.format('YYYY-MM-DD') || '',
                    date_to: dates?.[1]?.format('YYYY-MM-DD') || '',
                  };
                  setFilters((current) => ({ ...current, ...next }));
                  loadLedger({ ...next, page: 1 });
                }}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={() => loadLedger({ page: 1 })}>Apply</Button>
            </Space>
            <Table
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              scroll={{ x: 760 }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
              }}
              onChange={(next) => loadLedger({ page: next.current, page_size: next.pageSize })}
            />
          </Card>
        </Space>
      </div>

      <Drawer title={editingSubAccount ? 'Edit Sub-account' : 'Add Sub-account'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width="min(560px, 100vw)" footer={<Space style={{ justifyContent: 'flex-end', width: '100%' }}><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" loading={saving} onClick={saveSubAccount}>Save</Button></Space>}>
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
