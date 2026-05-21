import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { App, Button, Card, DatePicker, Drawer, Empty, Table, Typography, Upload, Space, Alert, theme } from 'antd';
import { ArrowLeftOutlined, ImportOutlined, UploadOutlined } from '@ant-design/icons';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const templateColumns = ['date', 'description', 'reference', 'debit', 'credit', 'balance', 'counterparty', 'remarks'];

export default function BankAccountShow({ id }) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [record, setRecord] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  const load = async (params = {}) => {
    setLoading(true);
    try {
      const [recordResponse, ledgerResponse] = await Promise.all([
        axios.get(api(`/api/bank-accounts/${id}`)),
        axios.get(api(`/api/bank-accounts/${id}/ledger`), { params }),
      ]);
      setRecord(recordResponse.data?.data || recordResponse.data);
      setLedger(ledgerResponse.data?.rows || []);
      setSummary(ledgerResponse.data || {});
    } catch {
      message.error('Failed to load bank account ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const parseFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const normalized = rows.map((row, index) => ({
      key: index,
      date: row.date || row.Date,
      description: row.description || row.Description,
      reference: row.reference || row.Reference,
      debit: Number(row.debit || row.Debit || 0),
      credit: Number(row.credit || row.Credit || 0),
      balance: row.balance || row.Balance || null,
      counterparty: row.counterparty || row.Counterparty || '',
      remarks: row.remarks || row.Remarks || '',
      warning: !(row.date || row.Date) || (!Number(row.debit || row.Debit || 0) && !Number(row.credit || row.Credit || 0)) ? 'Date and debit/credit are required.' : '',
    }));
    setPreview(normalized);
    return false;
  };

  const confirmImport = async () => {
    const validRows = preview.filter((row) => !row.warning);
    if (!validRows.length) {
      message.warning('No valid statement lines to import.');
      return;
    }
    setImporting(true);
    try {
      await axios.post(api(`/api/bank-accounts/${id}/statement-import`), { lines: validRows });
      message.success('Statement imported for review. No journal vouchers were posted.');
      setImportOpen(false);
      setPreview([]);
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to import statement.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([{ date: '2026-05-21', description: 'Deposit', reference: 'REF-001', debit: 1000, credit: 0, balance: 1000, counterparty: 'Customer', remarks: 'Sample' }], { header: templateColumns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
    XLSX.writeFile(workbook, 'bank-statement-template.xlsx');
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', width: 120 },
    { title: 'Voucher No', dataIndex: 'voucher_no', width: 150, render: (value, row) => row.journal_voucher_id ? <Link href={route('accounting.journal-vouchers.show', row.journal_voucher_id)}>{value || '-'}</Link> : value || '-' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Debit', dataIndex: 'debit', align: 'right', render: money },
    { title: 'Credit', dataIndex: 'credit', align: 'right', render: money },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: money },
  ];

  const keyCards = useMemo(() => [
    ['Balance in bank account', summary.statement_balance ?? record?.statement_balance],
    ['Balance in software', summary.software_balance ?? record?.software_ledger_balance],
    ['Reconciliation difference', Math.abs(Number(summary.statement_balance || 0) - Number(summary.software_balance || 0))],
    ['Last transaction date', summary.last_transaction_date || '-'],
  ], [record, summary]);

  return (
    <AuthenticatedLayout header={<Space direction="vertical" size={0}><Title level={4} style={{ margin: 0 }}>{record?.display_name || 'Bank Account'}</Title><Text type="secondary">{record?.bank_name || record?.code || 'Bank ledger'}</Text></Space>}>
      <Head title={record?.display_name || 'Bank Account'} />
      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
        <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('accounting.bank-accounts.index'))}>Back</Button>
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import Statement</Button>
            <RangePicker onChange={(dates) => load({ date_from: dates?.[0]?.format('YYYY-MM-DD'), date_to: dates?.[1]?.format('YYYY-MM-DD') })} />
          </Space>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: token.marginSM }}>
            {keyCards.map(([label, value]) => <Card key={label} bordered={false}><Text type="secondary">{label}</Text><div style={{ fontWeight: 700, fontSize: 18 }}>{typeof value === 'number' ? money(value) : value || '-'}</div></Card>)}
          </div>

          <Card title="Bank Balance Movement" loading={loading} bordered={false}>
            {ledger.length ? <div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={ledger}><CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={money} width={90} /><Tooltip formatter={money} /><Line type="monotone" dataKey="balance" stroke={token.colorPrimary} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <Empty description="No bank ledger movement found" />}
          </Card>

          <Card title="Ledger" bordered={false}><Table size="small" rowKey="id" columns={columns} dataSource={ledger} loading={loading} scroll={{ x: 900 }} /></Card>
        </Space>
      </div>

      <Drawer title="Import Bank Statement" open={importOpen} onClose={() => setImportOpen(false)} width="min(760px, 100vw)" footer={<Space style={{ justifyContent: 'flex-end', width: '100%' }}><Button onClick={() => setImportOpen(false)}>Cancel</Button><Button type="primary" loading={importing} disabled={!preview.length} onClick={confirmImport}>Confirm Import</Button></Space>}>
        <Space direction="vertical" style={{ width: '100%' }} size={token.margin}>
          <Alert type="info" showIcon message="Imported statement lines are saved for review and reconciliation. They do not post journal vouchers automatically." />
          <Space wrap><Button onClick={downloadTemplate}>Download Demo Template</Button><Upload accept=".csv,.xlsx,.xls" beforeUpload={parseFile} showUploadList={false}><Button icon={<UploadOutlined />}>Upload CSV or Excel</Button></Upload></Space>
          <Table size="small" rowKey="key" dataSource={preview} pagination={{ pageSize: 8 }} scroll={{ x: 900 }} columns={[...templateColumns.map((column) => ({ title: column, dataIndex: column })), { title: 'Warning', dataIndex: 'warning' }]} />
        </Space>
      </Drawer>
    </AuthenticatedLayout>
  );
}
