import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  DollarOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { relationLabel, toNumber, useMoneyFormatter } from './currency';

const { Text, Title } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const humanize = (key = '') =>
  String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(withTime ? 'MMM D, YYYY HH:mm' : 'DD-MM-YYYY') : value;
};

const moduleFromTitle = (title) => {
  if (/bank/i.test(title)) return 'bank';
  if (/cash/i.test(title)) return 'cash';
  if (/chart/i.test(title)) return 'chart';
  if (/journal/i.test(title)) return 'journal';
  if (/loan/i.test(title)) return 'loan';
  return 'generic';
};

const accountTypeColor = (type) => ({
  asset: '#1677ff',
  liability: '#d46b08',
  equity: '#722ed1',
  income: '#389e0d',
  expense: '#cf1322',
}[String(type || '').toLowerCase()] || '#4f46e5');

const moduleColor = (module, record) => ({
  bank: '#1647a6',
  cash: '#0f9f6e',
  chart: accountTypeColor(record?.type),
  journal: '#0f8f4f',
  loan: '#b7791f',
  generic: '#1647a6',
}[module]);

const moduleIcon = (module) => ({
  bank: <BankOutlined />,
  cash: <SwapOutlined />,
  chart: <SafetyCertificateOutlined />,
  journal: <FileTextOutlined />,
  loan: <DollarOutlined />,
}[module] || <FileTextOutlined />);

function Meta({ label, value }) {
  return (
    <div className="accounting-show__meta">
      <Text type="secondary">{label}</Text>
      <div>{value ?? '-'}</div>
    </div>
  );
}

function Metric({ label, value, action, tone = '#1647a6' }) {
  return (
    <Card className="accounting-show__metric" bordered={false}>
      <Text type="secondary">{label}</Text>
      <strong style={{ color: tone }}>{value}</strong>
      {action}
    </Card>
  );
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card className="accounting-show__card" title={title} extra={extra} bordered={false}>
      {children}
    </Card>
  );
}

function StatusTag({ record }) {
  if (record?.approved === true) return <Tag color="green">Approved</Tag>;
  if (record?.approved === false) return <Tag color="orange">Not Approved</Tag>;
  if (record?.active === false) return <Tag>Inactive</Tag>;
  if (record?.status) return <Tag color={record.status === 'posted' ? 'green' : 'blue'}>{humanize(record.status)}</Tag>;
  return <Tag color="blue">Active</Tag>;
}

function SummaryRail({ module, record, recordTitle, subtitle, title, formatMoney }) {
  const color = moduleColor(module, record);
  const amount = record?.amount ?? record?.balance ?? record?.total_amount ?? record?.total ?? record?.current_balance ?? record?.opening_balance ?? 0;

  return (
    <aside className="accounting-show__rail">
      <div className="accounting-show__entity">
        <div className="accounting-show__icon" style={{ color, borderColor: `${color}33`, background: `${color}0f` }}>
          {moduleIcon(module)}
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>{recordTitle}</Title>
          <Text type="secondary">{subtitle || title}</Text>
        </div>
      </div>

      <div className="accounting-show__amount">
        <Text type="secondary">Amount</Text>
        <strong>{formatMoney(amount)}</strong>
      </div>

      <div className="accounting-show__meta-list">
        <Meta label="Status" value={<StatusTag record={record} />} />
        <Meta label="Branch" value={relationLabel(record?.branch)} />
        <Meta label="Created" value={formatDate(record?.created_at, true)} />
        <Meta label="Updated" value={formatDate(record?.updated_at, true)} />
      </div>
    </aside>
  );
}

function ChartOfAccountDetails({ record, formatMoney }) {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', status: '', approved: '' });
  const transactions = record?.recent_transactions || [];
  const rows = transactions.filter((row) => {
    if (filters.date_from && dayjs(row.voucher_date).isBefore(dayjs(filters.date_from), 'day')) return false;
    if (filters.date_to && dayjs(row.voucher_date).isAfter(dayjs(filters.date_to), 'day')) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.approved !== '' && String(!!row.approved) !== filters.approved) return false;
    return true;
  });

  const exportRows = () => {
    const csv = [
      ['Voucher number', 'Voucher date', 'Description', 'Debit', 'Credit', 'Net movement', 'Voucher status', 'Approval status', 'Branch'],
      ...rows.map((row) => [
        row.voucher_no || '',
        row.voucher_date || '',
        row.description || '',
        row.debit || 0,
        row.credit || 0,
        row.net_movement || 0,
        row.status || '',
        row.approval_status || '',
        relationLabel(row.branch),
      ]),
    ].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record?.code || 'chart-of-account'}-transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DetailsCard title="Overview">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}><Meta label="Name" value={record?.name || '-'} /></Col>
          <Col xs={24} md={8}><Meta label="Code" value={record?.code || '-'} /></Col>
          <Col xs={24} md={8}><Meta label="Type" value={humanize(record?.type || '-')} /></Col>
          <Col xs={24} md={8}><Meta label="Parent Account" value={record?.parent ? <Link href={route('accounting.chart-of-accounts.show', record.parent.id)}>{relationLabel(record.parent)}</Link> : '-'} /></Col>
          <Col xs={24} md={8}><Meta label="Branch" value={relationLabel(record?.branch)} /></Col>
          <Col xs={24} md={8}><Meta label="Status" value={record?.active ? 'Active' : 'Inactive'} /></Col>
          <Col xs={24} md={8}><Meta label="Created Date" value={formatDate(record?.created_at, true)} /></Col>
          <Col xs={24} md={8}><Meta label="Updated Date" value={formatDate(record?.updated_at, true)} /></Col>
          <Col xs={24} md={8}><Meta label="Amount / Balance" value={formatMoney(record?.amount ?? record?.balance ?? 0)} /></Col>
          <Col xs={24}><Meta label="Description" value={record?.description || '-'} /></Col>
        </Row>
      </DetailsCard>

      <DetailsCard title="Recent Transactions" extra={<Button size="small" icon={<FileExcelOutlined />} onClick={exportRows}>Export Excel</Button>}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input type="date" value={filters.date_from} onChange={(event) => setFilters((x) => ({ ...x, date_from: event.target.value }))} />
          <Input type="date" value={filters.date_to} onChange={(event) => setFilters((x) => ({ ...x, date_to: event.target.value }))} />
          <Select allowClear placeholder="Status" value={filters.status || undefined} onChange={(value) => setFilters((x) => ({ ...x, status: value || '' }))} style={{ width: 150 }} options={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]} />
          <Select placeholder="Approval" value={filters.approved} onChange={(value) => setFilters((x) => ({ ...x, approved: value }))} style={{ width: 170 }} options={[{ value: '', label: 'All approvals' }, { value: 'true', label: 'Approved' }, { value: 'false', label: 'Not Approved' }]} />
        </Space>
        <Table
          size="small"
          columns={[
            { title: 'Voucher Number', dataIndex: 'voucher_no', render: (value, row) => row.journal_voucher_id ? <Link href={route('accounting.journal-vouchers.show', row.journal_voucher_id)}>{value || '-'}</Link> : value || '-' },
            { title: 'Voucher Date', dataIndex: 'voucher_date', render: formatDate },
            { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
            { title: 'Debit', dataIndex: 'debit', align: 'right', render: formatMoney },
            { title: 'Credit', dataIndex: 'credit', align: 'right', render: formatMoney },
            { title: 'Net Movement', dataIndex: 'net_movement', align: 'right', render: formatMoney },
            { title: 'Voucher Status', dataIndex: 'status', render: (value) => value || '-' },
            { title: 'Approval Status', dataIndex: 'approval_status', render: (value) => <Tag color={value === 'Approved' ? 'green' : 'orange'}>{value || 'Not Approved'}</Tag> },
            { title: 'Branch', dataIndex: 'branch', render: relationLabel },
          ]}
          dataSource={rows}
          rowKey={(row, index) => row?.id || index}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No recent transactions" /> }}
        />
      </DetailsCard>
    </>
  );
}

function BankAccountDetails({ record, formatMoney, currency }) {
  const statementBalance = record?.statement_balance ?? record?.opening_balance ?? 0;
  const softwareBalance = record?.software_ledger_balance ?? record?.current_balance ?? record?.opening_balance ?? 0;
  const difference = record?.reconciliation_difference ?? Math.abs(toNumber(statementBalance) - toNumber(softwareBalance));
  const reconciled = toNumber(difference) < 0.01;
  const transactions = record?.bank_transactions || [];

  return (
    <>
      <DetailsCard title="Bank Account">
        <Descriptions size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Display Name">{record?.display_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Bank Name">{record?.bank_name || (record?.type === 'cash' ? 'Cash Account' : '-')}</Descriptions.Item>
          <Descriptions.Item label="Account Name">{record?.account_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Account Number">{record?.account_number || '-'}</Descriptions.Item>
          <Descriptions.Item label="Account Type">{record?.account_type || humanize(record?.type || '-')}</Descriptions.Item>
          <Descriptions.Item label="Currency">{relationLabel(record?.currency)}</Descriptions.Item>
          <Descriptions.Item label="Branch">{relationLabel(record?.branch)}</Descriptions.Item>
          <Descriptions.Item label="Code">{record?.code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Swift Code">{record?.swift_code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Opening Balance">{formatMoney(record?.opening_balance)}</Descriptions.Item>
          <Descriptions.Item label="Current Software Balance">{formatMoney(softwareBalance)}</Descriptions.Item>
          <Descriptions.Item label="Created / Updated">{formatDate(record?.created_at, true)} / {formatDate(record?.updated_at, true)}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{record?.description || '-'}</Descriptions.Item>
        </Descriptions>
      </DetailsCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Metric label="Balance in Bank Account" value={formatMoney(statementBalance)} tone="#1647a6" action={<Text type="secondary">{currency.code} · Last statement {formatDate(record?.last_statement_date)}</Text>} />
        </Col>
        <Col xs={24} md={8}>
          <Metric label="Balance in Software" value={formatMoney(softwareBalance)} tone="#0f8f4f" action={<Text type="secondary">Base currency · Last transaction {formatDate(record?.last_software_transaction_date)}</Text>} />
        </Col>
        <Col xs={24} md={8}>
          <Metric label={reconciled ? 'Reconciled' : 'Reconciliation Needed'} value={`Difference ${formatMoney(difference)}`} tone={reconciled ? '#0f8f4f' : '#b7791f'} action={!reconciled ? <Button size="small" type="primary" onClick={() => router.visit(route('accounting.bank-accounts.index', { bank_account_id: record.id, view: 'reconcile' }))}>Reconcile Now</Button> : null} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <DetailsCard title="Balance History: Bank vs Software">
            <Table size="small" pagination={false} rowKey={(row, index) => row?.date || index} dataSource={record?.balance_history || []} columns={[
              { title: 'Date', dataIndex: 'date', render: formatDate },
              { title: 'Bank Statement Balance', dataIndex: 'bank_statement_balance', align: 'right', render: formatMoney },
              { title: 'Software Ledger Balance', dataIndex: 'software_ledger_balance', align: 'right', render: formatMoney },
            ]} locale={{ emptyText: <Empty description="No balance history" /> }} />
          </DetailsCard>
        </Col>
        <Col xs={24} lg={12}>
          <DetailsCard title="Deposit vs Withdrawal">
            <Table size="small" pagination={false} rowKey={(row, index) => row?.date || index} dataSource={record?.deposit_withdrawal_summary || []} columns={[
              { title: 'Date', dataIndex: 'date', render: formatDate },
              { title: 'Deposits', dataIndex: 'deposits', align: 'right', render: formatMoney },
              { title: 'Withdrawals', dataIndex: 'withdrawals', align: 'right', render: formatMoney },
            ]} locale={{ emptyText: <Empty description="No deposit or withdrawal data" /> }} />
          </DetailsCard>
        </Col>
      </Row>

      <DetailsCard title="Bank Transactions">
        <Tabs size="small" items={['all', 'matched', 'unmatched', 'needs_review', 'ignored'].map((key) => ({
          key,
          label: humanize(key),
          children: (
            <Table
              size="small"
              rowKey={(row, index) => row?.id || index}
              dataSource={key === 'all' ? transactions : transactions.filter((row) => row.matching_status === key)}
              columns={[
                { title: 'Transaction Date', dataIndex: 'transaction_date', render: formatDate },
                { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
                { title: 'Reference Number', dataIndex: 'reference_no', render: (value) => value || '-' },
                { title: 'Deposit', dataIndex: 'deposit', align: 'right', render: (value) => toNumber(value) ? formatMoney(value) : '-' },
                { title: 'Withdrawal', dataIndex: 'withdrawal', align: 'right', render: (value) => toNumber(value) ? formatMoney(value) : '-' },
                { title: 'Running Bank Balance', dataIndex: 'running_balance', align: 'right', render: formatMoney },
                { title: 'Matched Software Transaction', dataIndex: 'matched_transaction', render: relationLabel },
                { title: 'Matching Status', dataIndex: 'matching_status', render: (value) => <Tag>{humanize(value || 'unmatched')}</Tag> },
                { title: 'Difference', dataIndex: 'difference', align: 'right', render: formatMoney },
                { title: 'Actions', render: (_, row) => row?.matching_status === 'matched' ? '-' : <Space><Button size="small">Match Transaction</Button><Button size="small">Create Transaction</Button><Button size="small">Ignore</Button></Space> },
              ]}
              pagination={{ pageSize: 10 }}
            />
          ),
        }))} />
      </DetailsCard>
    </>
  );
}

function CashTransferDetails({ record, formatMoney }) {
  const lines = record?.items || record?.cash_transfer_lines || record?.cashTransferLines || [];
  const total = lines.reduce((sum, line) => sum + toNumber(line?.amount), 0);

  return (
    <>
      {record?.approved === false ? <Alert showIcon type="warning" message="This cash transfer is not approved yet." style={{ marginBottom: 0 }} /> : null}
      <DetailsCard title="Details">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}><Meta label="Transfer No" value={record?.transfer_no || '-'} /></Col>
          <Col xs={24} md={8}><Meta label="Date" value={formatDate(record?.transfer_date)} /></Col>
          <Col xs={24} md={8}><Meta label="Reference" value={record?.reference || '-'} /></Col>
          <Col xs={24} md={8}><Meta label="From Account" value={relationLabel(record?.from_account || record?.fromAccount)} /></Col>
          <Col xs={24} md={8}><Meta label="Status" value={record?.status || '-'} /></Col>
          <Col xs={24} md={8}><Meta label="Approval Status" value={record?.approved ? 'Approved' : 'Not Approved'} /></Col>
        </Row>
        <Table size="small" style={{ marginTop: 16 }} pagination={false} rowKey={(row, index) => row?.id || index} dataSource={lines} columns={[
          { title: 'Transferred To', render: (_, row) => relationLabel(row?.to_account || row?.toAccount) },
          { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
          { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatMoney },
        ]} summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>{formatMoney(total)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        )} />
      </DetailsCard>
    </>
  );
}

function JournalVoucherDetails({ record, formatMoney }) {
  const lines = record?.items || record?.journal_voucher_lines || record?.journalVoucherLines || record?.lines || [];
  const debitTotal = lines.reduce((sum, line) => sum + toNumber(line?.debit), 0);
  const creditTotal = lines.reduce((sum, line) => sum + toNumber(line?.credit), 0);
  const difference = Math.abs(debitTotal - creditTotal);

  return (
    <DetailsCard title="Journal Voucher">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Meta label="Voucher Number" value={record?.voucher_no || '-'} /></Col>
        <Col xs={24} md={8}><Meta label="Voucher Date" value={formatDate(record?.voucher_date)} /></Col>
        <Col xs={24} md={8}><Meta label="Reference" value={record?.reference || '-'} /></Col>
        <Col xs={24} md={8}><Meta label="Branch" value={relationLabel(record?.branch)} /></Col>
        <Col xs={24} md={8}><Meta label="Currency" value={relationLabel(record?.currency)} /></Col>
        <Col xs={24} md={8}><Meta label="Status" value={record?.status || '-'} /></Col>
        <Col xs={24} md={8}><Meta label="Approval Status" value={record?.approved ? 'Approved' : 'Not Approved'} /></Col>
        <Col xs={24}><Meta label="Narration" value={record?.narration || '-'} /></Col>
      </Row>
      <Table size="small" style={{ marginTop: 16 }} pagination={false} rowKey={(row, index) => row?.id || index} dataSource={lines} columns={[
        { title: 'Chart of Account', render: (_, row) => relationLabel(row?.chart_of_account || row?.chartOfAccount) },
        { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
        { title: 'Debit', dataIndex: 'debit', align: 'right', render: (value) => toNumber(value) ? formatMoney(value) : '-' },
        { title: 'Credit', dataIndex: 'credit', align: 'right', render: (value) => toNumber(value) ? formatMoney(value) : '-' },
      ]} summary={() => (
        <>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><strong>Total</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>{formatMoney(debitTotal)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><strong>{formatMoney(creditTotal)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}><strong>Difference</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>{formatMoney(difference)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        </>
      )} />
    </DetailsCard>
  );
}

function LoanAccountDetails({ record, formatMoney, onRefresh }) {
  const [accountOptions, setAccountOptions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('topup');
  const [editingRow, setEditingRow] = useState(null);
  const [savingLine, setSavingLine] = useState(false);
  const [lineForm] = Form.useForm();
  const topUps = record?.top_ups || record?.loan_top_ups || record?.loanTopUps || [];
  const charges = record?.charges || record?.loan_charges || record?.loanCharges || [];

  const approvalTag = (approved) => <Tag color={approved ? 'green' : 'orange'}>{approved ? 'Approved' : 'Not Approved'}</Tag>;
  const endpointFor = (type) => type === 'charge' ? '/api/loan-charges' : '/api/loan-top-ups';

  useEffect(() => {
    let mounted = true;

    axios
      .get(api('/api/accounts/?active=true&page_size=100&ordering=code'))
      .then((response) => {
        const rows = response.data?.results || (Array.isArray(response.data) ? response.data : []);
        if (mounted) {
          setAccountOptions(rows.map((row) => ({
            value: row.id,
            label: [row.code, row.name || row.label].filter(Boolean).join(' - ') || row.id,
          })));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const openLineModal = (type, row = null) => {
    setModalType(type);
    setEditingRow(row);
    lineForm.setFieldsValue(type === 'charge'
      ? {
          charge_name: row?.charge_name || '',
          charge_date: row?.charge_date ? dayjs(row.charge_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          charges_paid_from_account_id: row?.charges_paid_from_account_id || row?.charges_paid_from_account?.id || row?.chargesPaidFromAccount?.id || null,
          amount: toNumber(row?.amount),
          reference: row?.reference || '',
          notes: row?.notes || '',
          approved: !!row?.approved,
          active: row?.active !== false,
        }
      : {
          topup_date: row?.topup_date ? dayjs(row.topup_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          loan_received_in_account_id: row?.loan_received_in_account_id || row?.loan_received_in_account?.id || row?.loanReceivedInAccount?.id || record?.loan_received_in_account_id || null,
          amount: toNumber(row?.amount),
          reference: row?.reference || '',
          notes: row?.notes || '',
          approved: !!row?.approved,
          active: row?.active !== false,
        });
    setModalOpen(true);
  };

  const saveLine = async () => {
    const values = await lineForm.validateFields();
    const type = modalType;
    const isCharge = type === 'charge';
    const payload = {
      ...values,
      loan_account_id: record.id,
      amount: toNumber(values.amount),
      active: values.active !== false,
      approved: !!values.approved,
    };

    setSavingLine(true);
    try {
      const base = endpointFor(type);
      if (editingRow?.id) {
        await axios.patch(api(`${base}/${editingRow.id}`), payload);
      } else {
        await axios.post(api(`${base}/`), payload);
      }

      await onRefresh?.();
      message.success(`${isCharge ? 'Charge' : 'Top-up'} ${editingRow?.id ? 'updated' : 'created'}`);
      setModalOpen(false);
    } catch (error) {
      message.error(error?.response?.data?.message || `Failed to save ${isCharge ? 'charge' : 'top-up'}`);
    } finally {
      setSavingLine(false);
    }
  };

  const updateLineApproval = async (type, row, approved) => {
    try {
      await axios.patch(api(`${endpointFor(type)}/${row.id}`), { approved });
      await onRefresh?.();
      message.success(approved ? 'Marked as approved' : 'Marked as not approved');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Approval update failed');
    }
  };

  const deleteLine = (type, row) => {
    Modal.confirm({
      title: `Delete this ${type === 'charge' ? 'charge' : 'top-up'}?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await axios.delete(api(`${endpointFor(type)}/${row.id}`));
        await onRefresh?.();
        message.success(type === 'charge' ? 'Charge deleted' : 'Top-up deleted');
      },
    });
  };

  const rowActions = (type, row) => (
    <Space size={4}>
      <Button size="small" onClick={() => openLineModal(type, row)}>Edit</Button>
      <Button size="small" onClick={() => updateLineApproval(type, row, !row?.approved)}>
        {row?.approved ? 'Mark Not Approved' : 'Approve'}
      </Button>
      <Button size="small" danger onClick={() => deleteLine(type, row)}>Delete</Button>
    </Space>
  );

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Metric label="Opening Balance" value={formatMoney(record?.opening_balance)} /></Col>
        <Col xs={24} md={6}><Metric label="Current Balance" value={formatMoney(record?.current_balance)} tone="#0f8f4f" /></Col>
        <Col xs={24} md={6}><Metric label="Interest Rate" value={`${toNumber(record?.interest_rate_per_annum).toLocaleString()}%`} tone="#b7791f" /></Col>
        <Col xs={24} md={6}><Metric label="Duration" value={`${toNumber(record?.duration_in_month).toLocaleString()} months`} tone="#4f46e5" /></Col>
      </Row>
      <DetailsCard title="Loan Account Details">
        <Descriptions size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Loan Account">{record?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Lender Bank">{record?.bank_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Loan Number">{record?.loan_number || '-'}</Descriptions.Item>
          <Descriptions.Item label="Balance As Of">{formatDate(record?.balance_as_of)}</Descriptions.Item>
          <Descriptions.Item label="Loan Received In">{relationLabel(record?.loan_received_in_account || record?.loanReceivedInAccount)}</Descriptions.Item>
          <Descriptions.Item label="Related Account">{relationLabel(record?.related_account || record?.relatedAccount)}</Descriptions.Item>
          <Descriptions.Item label="Processing Fee">{formatMoney(record?.processing_fee)}</Descriptions.Item>
          <Descriptions.Item label="Status">{humanize(record?.status || 'active')}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{record?.description || '-'}</Descriptions.Item>
        </Descriptions>
      </DetailsCard>
      <DetailsCard
        title="Top-ups"
        extra={<Button size="small" type="primary" onClick={() => openLineModal('topup')}>Add Top-up</Button>}
      >
        <Table size="small" dataSource={topUps} rowKey={(row, index) => row?.id || index} pagination={false} columns={[
          { title: 'Date', dataIndex: 'topup_date', render: formatDate },
          { title: 'Received In', render: (_, row) => relationLabel(row?.loan_received_in_account || row?.loanReceivedInAccount) },
          { title: 'Reference', dataIndex: 'reference', render: (value) => value || '-' },
          { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatMoney },
          { title: 'Approval Status', dataIndex: 'approved', render: approvalTag },
          { title: 'Actions', width: 250, render: (_, row) => rowActions('topup', row) },
        ]} />
      </DetailsCard>
      <DetailsCard
        title="Charges"
        extra={<Button size="small" type="primary" onClick={() => openLineModal('charge')}>Add Charge</Button>}
      >
        <Table size="small" dataSource={charges} rowKey={(row, index) => row?.id || index} pagination={false} columns={[
          { title: 'Date', dataIndex: 'charge_date', render: formatDate },
          { title: 'Charge', dataIndex: 'charge_name', render: (value) => value || '-' },
          { title: 'Paid From', render: (_, row) => relationLabel(row?.charges_paid_from_account || row?.chargesPaidFromAccount) },
          { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatMoney },
          { title: 'Approval Status', dataIndex: 'approved', render: approvalTag },
          { title: 'Actions', width: 250, render: (_, row) => rowActions('charge', row) },
        ]} />
      </DetailsCard>

      <Modal
        title={`${editingRow?.id ? 'Edit' : 'Add'} ${modalType === 'charge' ? 'Loan Charge' : 'Loan Top-up'}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={saveLine}
        confirmLoading={savingLine}
        destroyOnClose
        width={620}
      >
        <Form form={lineForm} layout="vertical">
          {modalType === 'charge' ? (
            <>
              <Form.Item name="charge_name" label="Charge Name" rules={[{ required: true, message: 'Charge name is required' }]}>
                <Input placeholder="Processing fee, bank charge..." />
              </Form.Item>
              <Form.Item name="charge_date" label="Charge Date" rules={[{ required: true, message: 'Charge date is required' }]}>
                <Input type="date" />
              </Form.Item>
              <Form.Item name="charges_paid_from_account_id" label="Paid From Account" rules={[{ required: true, message: 'Paid from account is required' }]}>
                <Select showSearch placeholder="Select account" options={accountOptions} optionFilterProp="label" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="topup_date" label="Top-up Date" rules={[{ required: true, message: 'Top-up date is required' }]}>
                <Input type="date" />
              </Form.Item>
              <Form.Item name="loan_received_in_account_id" label="Received In Account" rules={[{ required: true, message: 'Received in account is required' }]}>
                <Select showSearch placeholder="Select account" options={accountOptions} optionFilterProp="label" />
              </Form.Item>
            </>
          )}
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="approved" label="Approval Status">
                <Select options={[{ value: false, label: 'Not Approved' }, { value: true, label: 'Approved' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="active" label="Status">
                <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

function GenericDetails({ record, formatMoney, title }) {
  const fields = Object.entries(record || {}).filter(([key, value]) => !['id', 'account', 'account_id_detail', 'items'].includes(key) && !Array.isArray(value));

  return (
    <DetailsCard title={`${title} Details`}>
      <Descriptions size="small" column={{ xs: 1, md: 2 }}>
        {fields.map(([key, value]) => (
          <Descriptions.Item key={key} label={humanize(key)}>
            {/(amount|balance|total|debit|credit)/i.test(key) ? formatMoney(value) : relationLabel(value)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </DetailsCard>
  );
}

export default function AccountingRecordShow({ id, title, endpoint, backRoute, backLabel, titleField = 'name', subtitleField }) {
  const { currency, formatMoney } = useMoneyFormatter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  const module = moduleFromTitle(title);
  const baseEndpoint = endpoint.replace(/\/+$/, '');

  const loadRecord = async () => {
    setLoading(true);
    try {
      const response = await axios.get(api(`${baseEndpoint}/${id}/`));
      setRecord(response.data?.data ?? response.data);
    } catch (error) {
      message.error(error?.response?.data?.message || `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [baseEndpoint, id]);

  const recordTitle = useMemo(() => (
    record?.[titleField] || record?.display_name || record?.voucher_no || record?.transfer_no || record?.code || title
  ), [record, title, titleField]);

  const subtitle = subtitleField && record?.[subtitleField] ? record[subtitleField] : record?.code || record?.reference || '';
  const canApprove = record && Object.prototype.hasOwnProperty.call(record, 'approved') && !record.approved;

  const updateRecord = async (payload, success) => {
    setSaving(true);
    try {
      await axios.patch(api(`${baseEndpoint}/${id}/`), payload);
      message.success(success);
      setEditOpen(false);
      await loadRecord();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    form.setFieldsValue(record || {});
    setEditOpen(true);
  };

  const renderDetails = () => {
    if (module === 'chart') return <ChartOfAccountDetails record={record} formatMoney={formatMoney} />;
    if (module === 'bank') return <BankAccountDetails record={record} formatMoney={formatMoney} currency={currency} />;
    if (module === 'cash') return <CashTransferDetails record={record} formatMoney={formatMoney} />;
    if (module === 'journal') return <JournalVoucherDetails record={record} formatMoney={formatMoney} />;
    if (module === 'loan') return <LoanAccountDetails record={record} formatMoney={formatMoney} onRefresh={loadRecord} />;
    return <GenericDetails record={record} formatMoney={formatMoney} title={title} />;
  };

  return (
    <AuthenticatedLayout>
      <Head title={recordTitle || title} />
      <style>{`
        .accounting-show { min-height: calc(100vh - 64px); background: #edf2f8; }
        .accounting-show__bar { height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: #fff; border-bottom: 1px solid #d9e1ec; }
        .accounting-show__crumb { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .accounting-show__body { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 10px; }
        .accounting-show__rail { background: #fff; border-right: 1px solid #d9e1ec; min-height: calc(100vh - 114px); padding: 18px 20px; }
        .accounting-show__entity { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #e3e9f2; }
        .accounting-show__icon { width: 42px; height: 42px; border: 1px solid; border-radius: 8px; display: grid; place-items: center; font-size: 20px; flex: none; }
        .accounting-show__amount { padding: 18px 0; border-bottom: 1px solid #e3e9f2; display: flex; flex-direction: column; gap: 6px; }
        .accounting-show__amount strong { font-size: 20px; color: #10233f; }
        .accounting-show__meta-list { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; }
        .accounting-show__meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .accounting-show__main { padding: 10px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .accounting-show__card.ant-card, .accounting-show__metric.ant-card { border-radius: 6px; box-shadow: none; }
        .accounting-show__metric .ant-card-body { min-height: 112px; display: flex; flex-direction: column; gap: 10px; }
        .accounting-show__metric strong { font-size: 20px; font-weight: 650; }
        .accounting-show .ant-table-thead > tr > th, .accounting-show .ant-table-summary > tr > td { background: #e9eff7; font-weight: 700; }
        @media (max-width: 992px) { .accounting-show__body { grid-template-columns: 1fr; } .accounting-show__rail { min-height: auto; border-right: 0; border-bottom: 1px solid #d9e1ec; } }
      `}</style>

      <div className="accounting-show">
        <div className="accounting-show__bar">
          <div className="accounting-show__crumb">
            <Link href={route(backRoute)}><Button type="text" icon={<ArrowLeftOutlined />}>{backLabel}</Button></Link>
            <Text ellipsis style={{ maxWidth: 420 }}>{loading ? title : recordTitle}</Text>
          </div>
          <Space>
            <Dropdown
              menu={{
                items: [
                  { key: 'edit', label: `Edit ${title}` },
                  record?.active === false ? { key: 'active', label: 'Make Active' } : { key: 'inactive', label: 'Make Inactive' },
                  canApprove ? { key: 'approve', label: 'Approve', icon: <CheckCircleOutlined /> } : null,
                ].filter(Boolean),
                onClick: ({ key }) => {
                  if (key === 'edit') openEdit();
                  if (key === 'active') updateRecord({ active: true }, `${title} activated`);
                  if (key === 'inactive') updateRecord({ active: false }, `${title} inactivated`);
                  if (key === 'approve') updateRecord({ approved: true, status: record?.status === 'draft' ? 'posted' : record?.status }, `${title} approved`);
                },
              }}
              trigger={['click']}
            >
              <Button>Options <MoreOutlined /></Button>
            </Dropdown>
            <Button type="text" icon={<CloseOutlined />} onClick={() => router.visit(route(backRoute))} />
          </Space>
        </div>

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : !record ? (
          <div style={{ padding: 18 }}><Empty description={`${title} not found`} /></div>
        ) : (
          <div className="accounting-show__body">
            <SummaryRail module={module} record={record} recordTitle={recordTitle} subtitle={subtitle} title={title} formatMoney={formatMoney} />
            <main className="accounting-show__main">
              {canApprove && module !== 'cash' ? <Alert showIcon type="warning" message={`${title} is not approved yet.`} action={<Button type="primary" onClick={() => updateRecord({ approved: true }, `${title} approved`)}>Approve</Button>} /> : null}
              {record?.active === false && module === 'bank' ? <Alert showIcon type="warning" message="This bank account is inactive." action={<Button type="primary" onClick={() => updateRecord({ active: true }, 'Bank account activated')}>Make Active</Button>} /> : null}
              {renderDetails()}
            </main>
          </div>
        )}
      </div>

      <Modal
        title={`Edit ${title}`}
        open={editOpen}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.validateFields().then((values) => updateRecord(values, `${title} updated`))}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {module === 'chart' ? (
            <>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="active" label="Status"><Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} /></Form.Item>
            </>
          ) : null}
          {module === 'bank' ? (
            <>
              <Form.Item name="display_name" label="Display Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="bank_name" label="Bank Name"><Input /></Form.Item>
              <Form.Item name="account_name" label="Account Name"><Input /></Form.Item>
              <Form.Item name="account_number" label="Account Number"><Input /></Form.Item>
              <Form.Item name="account_type" label="Account Type"><Input /></Form.Item>
              <Form.Item name="swift_code" label="Swift Code"><Input /></Form.Item>
              <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
            </>
          ) : null}
          {module === 'cash' ? (
            <>
              <Form.Item name="reference" label="Reference"><Input /></Form.Item>
              <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="status" label="Status"><Select options={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]} /></Form.Item>
            </>
          ) : null}
          {module === 'journal' ? (
            <>
              <Form.Item name="reference" label="Reference"><Input /></Form.Item>
              <Form.Item name="narration" label="Narration"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="status" label="Status"><Select options={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]} /></Form.Item>
            </>
          ) : null}
          {module === 'loan' ? (
            <>
              <Form.Item name="name" label="Loan Account Name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="bank_name" label="Lender Bank"><Input /></Form.Item>
              <Form.Item name="loan_number" label="Loan Number"><Input /></Form.Item>
              <Form.Item name="opening_balance" label="Opening Balance"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="current_balance" label="Current Balance"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}
