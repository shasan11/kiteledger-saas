import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
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
  theme,
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
const { useToken } = theme;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const humanize = (key = '') =>
  String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value, withTime = false) => {
  if (!value) return '-';

  const parsed = dayjs(value);

  return parsed.isValid()
    ? parsed.format(withTime ? 'MMM D, YYYY HH:mm' : 'DD-MM-YYYY')
    : value;
};

const cleanValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  return value;
};

const moduleFromTitle = (title) => {
  if (/bank/i.test(title)) return 'bank';
  if (/cash/i.test(title)) return 'cash';
  if (/chart/i.test(title)) return 'chart';
  if (/journal/i.test(title)) return 'journal';
  if (/loan/i.test(title)) return 'loan';

  return 'generic';
};

const accountTypeColor = (type, token) =>
  ({
    asset: token.colorPrimary,
    liability: token.colorWarning,
    equity: token.colorInfo,
    income: token.colorSuccess,
    expense: token.colorError,
  }[String(type || '').toLowerCase()] || token.colorPrimary);

const moduleColor = (module, record, token) =>
  ({
    bank: token.colorPrimary,
    cash: token.colorSuccess,
    chart: accountTypeColor(record?.type, token),
    journal: token.colorSuccess,
    loan: token.colorWarning,
    generic: token.colorPrimary,
  }[module] || token.colorPrimary);

const moduleIcon = (module) =>
  ({
    bank: <BankOutlined />,
    cash: <SwapOutlined />,
    chart: <SafetyCertificateOutlined />,
    journal: <FileTextOutlined />,
    loan: <DollarOutlined />,
  }[module] || <FileTextOutlined />);

function DetailsCard({ title, extra, children }) {
  return (
    <Card
      className="accounting-show__card"
      title={title}
      extra={extra}
      bordered
    >
      {children}
    </Card>
  );
}

function Metric({ label, value, action, tone = 'primary' }) {
  return (
    <Card
      className="accounting-show__metric"
      bordered
      style={{ '--metric-color': `var(--accounting-show-${tone})` }}
    >
      <Text type="secondary">{label}</Text>
      <strong>{value}</strong>
      {action}
    </Card>
  );
}

function InfoTable({ rows = [], columns = 2 }) {
  const filteredRows = rows.filter(Boolean);
  const tableRows = [];

  for (let i = 0; i < filteredRows.length; i += columns) {
    tableRows.push(filteredRows.slice(i, i + columns));
  }

  return (
    <table className="accounting-show__info-table">
      <tbody>
        {tableRows.map((group, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, index) => {
              const item = group[index];

              return (
                <React.Fragment key={index}>
                  <th>{item?.label || ''}</th>
                  <td>{item ? cleanValue(item.value) : ''}</td>
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RailInfoTable({ rows = [] }) {
  return (
    <table className="accounting-show__rail-table">
      <tbody>
        {rows.filter(Boolean).map((row) => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td>{cleanValue(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusTag({ record }) {
  if (record?.approved === true) return <Tag color="success">Approved</Tag>;
  if (record?.approved === false) return <Tag color="warning">Not Approved</Tag>;
  if (record?.active === false) return <Tag>Inactive</Tag>;

  if (record?.status) {
    return (
      <Tag color={record.status === 'posted' ? 'success' : 'processing'}>
        {humanize(record.status)}
      </Tag>
    );
  }

  return <Tag color="processing">Active</Tag>;
}

function SummaryRail({ module, record, recordTitle, subtitle, title, formatMoney, token }) {
  const color = moduleColor(module, record, token);

  const amount =
    record?.amount ??
    record?.balance ??
    record?.total_amount ??
    record?.total ??
    record?.current_balance ??
    record?.opening_balance ??
    0;

  return (
    <aside
      className="accounting-show__rail"
      style={{ '--module-color': color }}
    >
      <div className="accounting-show__entity">
        <div className="accounting-show__icon">{moduleIcon(module)}</div>

        <div className="accounting-show__entity-text">
          <Title level={4}>{recordTitle}</Title>
          <Text type="secondary">{subtitle || title}</Text>
        </div>
      </div>

      <div className="accounting-show__amount">
        <Text type="secondary">Amount</Text>
        <strong>{formatMoney(amount)}</strong>
      </div>

      <RailInfoTable
        rows={[
          { label: 'Status', value: <StatusTag record={record} /> },
          { label: 'Branch', value: relationLabel(record?.branch) },
          { label: 'Created', value: formatDate(record?.created_at, true) },
          { label: 'Updated', value: formatDate(record?.updated_at, true) },
        ]}
      />
    </aside>
  );
}

function ChartOfAccountDetails({ record, formatMoney }) {
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    status: '',
    approved: '',
  });

  const transactions = record?.recent_transactions || [];

  const rows = transactions.filter((row) => {
    if (filters.date_from && dayjs(row.voucher_date).isBefore(dayjs(filters.date_from), 'day')) {
      return false;
    }

    if (filters.date_to && dayjs(row.voucher_date).isAfter(dayjs(filters.date_to), 'day')) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }

    if (filters.approved !== '' && String(!!row.approved) !== filters.approved) {
      return false;
    }

    return true;
  });

  const exportRows = () => {
    const csv = [
      [
        'Voucher number',
        'Voucher date',
        'Description',
        'Debit',
        'Credit',
        'Net movement',
        'Voucher status',
        'Approval status',
        'Branch',
      ],
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
    ]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

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
        <InfoTable
          rows={[
            { label: 'Name', value: record?.name },
            { label: 'Code', value: record?.code },
            { label: 'Type', value: humanize(record?.type || '-') },
            {
              label: 'Parent Account',
              value: record?.parent ? (
                <Link href={route('accounting.chart-of-accounts.show', record.parent.id)}>
                  {relationLabel(record.parent)}
                </Link>
              ) : (
                '-'
              ),
            },
            { label: 'Branch', value: relationLabel(record?.branch) },
            { label: 'Status', value: record?.active ? 'Active' : 'Inactive' },
            { label: 'Created Date', value: formatDate(record?.created_at, true) },
            { label: 'Updated Date', value: formatDate(record?.updated_at, true) },
            {
              label: 'Amount / Balance',
              value: formatMoney(record?.amount ?? record?.balance ?? 0),
            },
            { label: 'Description', value: record?.description },
          ]}
        />
      </DetailsCard>

      <DetailsCard
        title="Recent Transactions"
        extra={
          <Button size="small" icon={<FileExcelOutlined />} onClick={exportRows}>
            Export Excel
          </Button>
        }
      >
        <Space wrap className="accounting-show__filters">
          <Input
            type="date"
            value={filters.date_from}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_from: event.target.value }))
            }
          />

          <Input
            type="date"
            value={filters.date_to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, date_to: event.target.value }))
            }
          />

          <Select
            allowClear
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value || '' }))
            }
            style={{ width: 150 }}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'posted', label: 'Posted' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          <Select
            placeholder="Approval"
            value={filters.approved}
            onChange={(value) =>
              setFilters((current) => ({ ...current, approved: value }))
            }
            style={{ width: 170 }}
            options={[
              { value: '', label: 'All approvals' },
              { value: 'true', label: 'Approved' },
              { value: 'false', label: 'Not Approved' },
            ]}
          />
        </Space>

        <Table
          size="small"
          scroll={{ x: 1100 }}
          columns={[
            {
              title: 'Voucher Number',
              dataIndex: 'voucher_no',
              width: 150,
              render: (value, row) =>
                row.journal_voucher_id ? (
                  <Link href={route('accounting.journal-vouchers.show', row.journal_voucher_id)}>
                    {value || '-'}
                  </Link>
                ) : (
                  value || '-'
                ),
            },
            {
              title: 'Voucher Date',
              dataIndex: 'voucher_date',
              width: 130,
              render: formatDate,
            },
            {
              title: 'Description',
              dataIndex: 'description',
              width: 220,
              render: (value) => value || '-',
            },
            {
              title: 'Debit',
              dataIndex: 'debit',
              width: 120,
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Credit',
              dataIndex: 'credit',
              width: 120,
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Net Movement',
              dataIndex: 'net_movement',
              width: 140,
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Voucher Status',
              dataIndex: 'status',
              width: 130,
              render: (value) => value || '-',
            },
            {
              title: 'Approval Status',
              dataIndex: 'approval_status',
              width: 140,
              render: (value) => (
                <Tag color={value === 'Approved' ? 'success' : 'warning'}>
                  {value || 'Not Approved'}
                </Tag>
              ),
            },
            {
              title: 'Branch',
              dataIndex: 'branch',
              width: 150,
              render: relationLabel,
            },
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

  const softwareBalance =
    record?.software_ledger_balance ??
    record?.current_balance ??
    record?.opening_balance ??
    0;

  const difference =
    record?.reconciliation_difference ??
    Math.abs(toNumber(statementBalance) - toNumber(softwareBalance));

  const reconciled = toNumber(difference) < 0.01;
  const transactions = record?.bank_transactions || [];

  return (
    <>
      <DetailsCard title="Bank Account">
        <InfoTable
          rows={[
            { label: 'Display Name', value: record?.display_name },
            {
              label: 'Bank Name',
              value: record?.bank_name || (record?.type === 'cash' ? 'Cash Account' : '-'),
            },
            { label: 'Account Name', value: record?.account_name },
            { label: 'Account Number', value: record?.account_number },
            { label: 'Account Type', value: record?.account_type || humanize(record?.type || '-') },
            { label: 'Currency', value: relationLabel(record?.currency) },
            { label: 'Branch', value: relationLabel(record?.branch) },
            { label: 'Code', value: record?.code },
            { label: 'Swift Code', value: record?.swift_code },
            { label: 'Opening Balance', value: formatMoney(record?.opening_balance) },
            { label: 'Current Software Balance', value: formatMoney(softwareBalance) },
            { label: 'Created', value: formatDate(record?.created_at, true) },
            { label: 'Updated', value: formatDate(record?.updated_at, true) },
            { label: 'Description', value: record?.description },
          ]}
        />
      </DetailsCard>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Metric
            label="Balance in Bank Account"
            value={formatMoney(statementBalance)}
            tone="primary"
            action={
              <Text type="secondary">
                {currency?.code || 'Base'} · Last statement {formatDate(record?.last_statement_date)}
              </Text>
            }
          />
        </Col>

        <Col xs={24} md={8}>
          <Metric
            label="Balance in Software"
            value={formatMoney(softwareBalance)}
            tone="success"
            action={
              <Text type="secondary">
                Base currency · Last transaction {formatDate(record?.last_software_transaction_date)}
              </Text>
            }
          />
        </Col>

        <Col xs={24} md={8}>
          <Metric
            label={reconciled ? 'Reconciled' : 'Reconciliation Needed'}
            value={`Difference ${formatMoney(difference)}`}
            tone={reconciled ? 'success' : 'warning'}
            action={
              !reconciled ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    router.visit(
                      route('accounting.bank-accounts.index', {
                        bank_account_id: record.id,
                        view: 'reconcile',
                      })
                    )
                  }
                >
                  Reconcile Now
                </Button>
              ) : null
            }
          />
        </Col>
      </Row>

      <DetailsCard title="Balance History: Bank vs Software">
        <Table
          size="small"
          pagination={false}
          rowKey={(row, index) => row?.date || index}
          dataSource={record?.balance_history || []}
          columns={[
            {
              title: 'Date',
              dataIndex: 'date',
              width: 150,
              render: formatDate,
            },
            {
              title: 'Bank Statement Balance',
              dataIndex: 'bank_statement_balance',
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Software Ledger Balance',
              dataIndex: 'software_ledger_balance',
              align: 'right',
              render: formatMoney,
            },
          ]}
          locale={{ emptyText: <Empty description="No balance history" /> }}
        />
      </DetailsCard>

      <DetailsCard title="Deposit vs Withdrawal">
        <Table
          size="small"
          pagination={false}
          rowKey={(row, index) => row?.date || index}
          dataSource={record?.deposit_withdrawal_summary || []}
          columns={[
            {
              title: 'Date',
              dataIndex: 'date',
              width: 150,
              render: formatDate,
            },
            {
              title: 'Deposits',
              dataIndex: 'deposits',
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Withdrawals',
              dataIndex: 'withdrawals',
              align: 'right',
              render: formatMoney,
            },
          ]}
          locale={{ emptyText: <Empty description="No deposit or withdrawal data" /> }}
        />
      </DetailsCard>

      <DetailsCard title="Bank Transactions">
        <Tabs
          size="small"
          items={['all', 'matched', 'unmatched', 'needs_review', 'ignored'].map((key) => ({
            key,
            label: humanize(key),
            children: (
              <Table
                size="small"
                scroll={{ x: 1500 }}
                rowKey={(row, index) => row?.id || index}
                dataSource={
                  key === 'all'
                    ? transactions
                    : transactions.filter((row) => row.matching_status === key)
                }
                columns={[
                  {
                    title: 'Transaction Date',
                    dataIndex: 'transaction_date',
                    width: 150,
                    render: formatDate,
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    width: 260,
                    render: (value) => value || '-',
                  },
                  {
                    title: 'Reference Number',
                    dataIndex: 'reference_no',
                    width: 170,
                    render: (value) => value || '-',
                  },
                  {
                    title: 'Deposit',
                    dataIndex: 'deposit',
                    width: 130,
                    align: 'right',
                    render: (value) => (toNumber(value) ? formatMoney(value) : '-'),
                  },
                  {
                    title: 'Withdrawal',
                    dataIndex: 'withdrawal',
                    width: 130,
                    align: 'right',
                    render: (value) => (toNumber(value) ? formatMoney(value) : '-'),
                  },
                  {
                    title: 'Running Balance',
                    dataIndex: 'running_balance',
                    width: 160,
                    align: 'right',
                    render: formatMoney,
                  },
                  {
                    title: 'Matched Software Transaction',
                    dataIndex: 'matched_transaction',
                    width: 220,
                    render: relationLabel,
                  },
                  {
                    title: 'Matching Status',
                    dataIndex: 'matching_status',
                    width: 150,
                    render: (value) => <Tag>{humanize(value || 'unmatched')}</Tag>,
                  },
                  {
                    title: 'Difference',
                    dataIndex: 'difference',
                    width: 130,
                    align: 'right',
                    render: formatMoney,
                  },
                  {
                    title: 'Actions',
                    width: 280,
                    fixed: 'right',
                    render: (_, row) =>
                      row?.matching_status === 'matched' ? (
                        '-'
                      ) : (
                        <Space size={4}>
                          <Button size="small">Match</Button>
                          <Button size="small">Create</Button>
                          <Button size="small">Ignore</Button>
                        </Space>
                      ),
                  },
                ]}
                pagination={{ pageSize: 10 }}
              />
            ),
          }))}
        />
      </DetailsCard>
    </>
  );
}

function CashTransferDetails({ record, formatMoney }) {
  const lines =
    record?.items ||
    record?.cash_transfer_lines ||
    record?.cashTransferLines ||
    [];

  const total = lines.reduce((sum, line) => sum + toNumber(line?.amount), 0);

  return (
    <>
      {record?.approved === false ? (
        <Alert
          showIcon
          type="warning"
          message="This cash transfer is not approved yet."
        />
      ) : null}

      <DetailsCard title="Details">
        <InfoTable
          rows={[
            { label: 'Transfer No', value: record?.transfer_no },
            { label: 'Date', value: formatDate(record?.transfer_date) },
            { label: 'Reference', value: record?.reference },
            {
              label: 'From Account',
              value: relationLabel(record?.from_account || record?.fromAccount),
            },
            { label: 'Status', value: record?.status },
            { label: 'Approval Status', value: record?.approved ? 'Approved' : 'Not Approved' },
          ]}
        />

        <Table
          size="small"
          className="accounting-show__spaced-table"
          pagination={false}
          rowKey={(row, index) => row?.id || index}
          dataSource={lines}
          columns={[
            {
              title: 'Transferred To',
              render: (_, row) => relationLabel(row?.to_account || row?.toAccount),
            },
            {
              title: 'Description',
              dataIndex: 'description',
              render: (value) => value || '-',
            },
            {
              title: 'Amount',
              dataIndex: 'amount',
              align: 'right',
              render: formatMoney,
            },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total</strong>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={1} align="right">
                <strong>{formatMoney(total)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </DetailsCard>
    </>
  );
}

function JournalVoucherDetails({ record, formatMoney }) {
  const lines =
    record?.items ||
    record?.journal_voucher_lines ||
    record?.journalVoucherLines ||
    record?.lines ||
    [];

  const debitTotal = lines.reduce((sum, line) => sum + toNumber(line?.debit), 0);
  const creditTotal = lines.reduce((sum, line) => sum + toNumber(line?.credit), 0);
  const difference = Math.abs(debitTotal - creditTotal);

  return (
    <DetailsCard title="Journal Voucher">
      <InfoTable
        rows={[
          { label: 'Voucher Number', value: record?.voucher_no },
          { label: 'Voucher Date', value: formatDate(record?.voucher_date) },
          { label: 'Reference', value: record?.reference },
          { label: 'Branch', value: relationLabel(record?.branch) },
          { label: 'Currency', value: relationLabel(record?.currency) },
          { label: 'Status', value: record?.status },
          { label: 'Approval Status', value: record?.approved ? 'Approved' : 'Not Approved' },
          { label: 'Narration', value: record?.narration },
        ]}
      />

      <Table
        size="small"
        className="accounting-show__spaced-table"
        pagination={false}
        rowKey={(row, index) => row?.id || index}
        dataSource={lines}
        columns={[
          {
            title: 'Chart of Account',
            render: (_, row) =>
              relationLabel(row?.chart_of_account || row?.chartOfAccount),
          },
          {
            title: 'Description',
            dataIndex: 'description',
            render: (value) => value || '-',
          },
          {
            title: 'Debit',
            dataIndex: 'debit',
            align: 'right',
            render: (value) => (toNumber(value) ? formatMoney(value) : '-'),
          },
          {
            title: 'Credit',
            dataIndex: 'credit',
            align: 'right',
            render: (value) => (toNumber(value) ? formatMoney(value) : '-'),
          },
        ]}
        summary={() => (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total</strong>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={1} align="right">
                <strong>{formatMoney(debitTotal)}</strong>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={2} align="right">
                <strong>{formatMoney(creditTotal)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>Difference</strong>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={1} align="right">
                <strong>{formatMoney(difference)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )}
      />
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

  const topUps =
    record?.top_ups ||
    record?.loan_top_ups ||
    record?.loanTopUps ||
    [];

  const charges =
    record?.charges ||
    record?.loan_charges ||
    record?.loanCharges ||
    [];

  const approvalTag = (approved) => (
    <Tag color={approved ? 'success' : 'warning'}>
      {approved ? 'Approved' : 'Not Approved'}
    </Tag>
  );

  const endpointFor = (type) =>
    type === 'charge' ? '/api/loan-charges' : '/api/loan-top-ups';

  useEffect(() => {
    let mounted = true;

    axios
      .get(api('/api/accounts/?active=true&page_size=100&ordering=code'))
      .then((response) => {
        const rows =
          response.data?.results ||
          (Array.isArray(response.data) ? response.data : []);

        if (mounted) {
          setAccountOptions(
            rows.map((row) => ({
              value: row.id,
              label:
                [row.code, row.name || row.label].filter(Boolean).join(' - ') ||
                row.id,
            }))
          );
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

    lineForm.setFieldsValue(
      type === 'charge'
        ? {
            charge_name: row?.charge_name || '',
            charge_date: row?.charge_date
              ? dayjs(row.charge_date).format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD'),
            charges_paid_from_account_id:
              row?.charges_paid_from_account_id ||
              row?.charges_paid_from_account?.id ||
              row?.chargesPaidFromAccount?.id ||
              null,
            amount: toNumber(row?.amount),
            reference: row?.reference || '',
            notes: row?.notes || '',
            approved: !!row?.approved,
            active: row?.active !== false,
          }
        : {
            topup_date: row?.topup_date
              ? dayjs(row.topup_date).format('YYYY-MM-DD')
              : dayjs().format('YYYY-MM-DD'),
            loan_received_in_account_id:
              row?.loan_received_in_account_id ||
              row?.loan_received_in_account?.id ||
              row?.loanReceivedInAccount?.id ||
              record?.loan_received_in_account_id ||
              null,
            amount: toNumber(row?.amount),
            reference: row?.reference || '',
            notes: row?.notes || '',
            approved: !!row?.approved,
            active: row?.active !== false,
          }
    );

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

      message.success(
        `${isCharge ? 'Charge' : 'Top-up'} ${
          editingRow?.id ? 'updated' : 'created'
        }`
      );

      setModalOpen(false);
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          `Failed to save ${isCharge ? 'charge' : 'top-up'}`
      );
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
      <Button size="small" onClick={() => openLineModal(type, row)}>
        Edit
      </Button>

      <Button size="small" onClick={() => updateLineApproval(type, row, !row?.approved)}>
        {row?.approved ? 'Mark Not Approved' : 'Approve'}
      </Button>

      <Button size="small" danger onClick={() => deleteLine(type, row)}>
        Delete
      </Button>
    </Space>
  );

  return (
    <>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={6}>
          <Metric label="Opening Balance" value={formatMoney(record?.opening_balance)} />
        </Col>

        <Col xs={24} md={6}>
          <Metric
            label="Current Balance"
            value={formatMoney(record?.current_balance)}
            tone="success"
          />
        </Col>

        <Col xs={24} md={6}>
          <Metric
            label="Interest Rate"
            value={`${toNumber(record?.interest_rate_per_annum).toLocaleString()}%`}
            tone="warning"
          />
        </Col>

        <Col xs={24} md={6}>
          <Metric
            label="Duration"
            value={`${toNumber(record?.duration_in_month).toLocaleString()} months`}
            tone="info"
          />
        </Col>
      </Row>

      <DetailsCard title="Loan Account Details">
        <InfoTable
          rows={[
            { label: 'Loan Account', value: record?.name },
            { label: 'Lender Bank', value: record?.bank_name },
            { label: 'Loan Number', value: record?.loan_number },
            { label: 'Balance As Of', value: formatDate(record?.balance_as_of) },
            {
              label: 'Loan Received In',
              value: relationLabel(record?.loan_received_in_account || record?.loanReceivedInAccount),
            },
            {
              label: 'Related Account',
              value: relationLabel(record?.related_account || record?.relatedAccount),
            },
            { label: 'Processing Fee', value: formatMoney(record?.processing_fee) },
            { label: 'Status', value: humanize(record?.status || 'active') },
            { label: 'Description', value: record?.description },
          ]}
        />
      </DetailsCard>

      <DetailsCard
        title="Top-ups"
        extra={
          <Button size="small" type="primary" onClick={() => openLineModal('topup')}>
            Add Top-up
          </Button>
        }
      >
        <Table
          size="small"
          dataSource={topUps}
          rowKey={(row, index) => row?.id || index}
          pagination={false}
          columns={[
            {
              title: 'Date',
              dataIndex: 'topup_date',
              render: formatDate,
            },
            {
              title: 'Received In',
              render: (_, row) =>
                relationLabel(row?.loan_received_in_account || row?.loanReceivedInAccount),
            },
            {
              title: 'Reference',
              dataIndex: 'reference',
              render: (value) => value || '-',
            },
            {
              title: 'Amount',
              dataIndex: 'amount',
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Approval Status',
              dataIndex: 'approved',
              render: approvalTag,
            },
            {
              title: 'Actions',
              width: 250,
              render: (_, row) => rowActions('topup', row),
            },
          ]}
        />
      </DetailsCard>

      <DetailsCard
        title="Charges"
        extra={
          <Button size="small" type="primary" onClick={() => openLineModal('charge')}>
            Add Charge
          </Button>
        }
      >
        <Table
          size="small"
          dataSource={charges}
          rowKey={(row, index) => row?.id || index}
          pagination={false}
          columns={[
            {
              title: 'Date',
              dataIndex: 'charge_date',
              render: formatDate,
            },
            {
              title: 'Charge',
              dataIndex: 'charge_name',
              render: (value) => value || '-',
            },
            {
              title: 'Paid From',
              render: (_, row) =>
                relationLabel(row?.charges_paid_from_account || row?.chargesPaidFromAccount),
            },
            {
              title: 'Amount',
              dataIndex: 'amount',
              align: 'right',
              render: formatMoney,
            },
            {
              title: 'Approval Status',
              dataIndex: 'approved',
              render: approvalTag,
            },
            {
              title: 'Actions',
              width: 250,
              render: (_, row) => rowActions('charge', row),
            },
          ]}
        />
      </DetailsCard>

      <Modal
        title={`${editingRow?.id ? 'Edit' : 'Add'} ${
          modalType === 'charge' ? 'Loan Charge' : 'Loan Top-up'
        }`}
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
              <Form.Item
                name="charge_name"
                label="Charge Name"
                rules={[{ required: true, message: 'Charge name is required' }]}
              >
                <Input placeholder="Processing fee, bank charge..." />
              </Form.Item>

              <Form.Item
                name="charge_date"
                label="Charge Date"
                rules={[{ required: true, message: 'Charge date is required' }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                name="charges_paid_from_account_id"
                label="Paid From Account"
                rules={[{ required: true, message: 'Paid from account is required' }]}
              >
                <Select
                  showSearch
                  placeholder="Select account"
                  options={accountOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="topup_date"
                label="Top-up Date"
                rules={[{ required: true, message: 'Top-up date is required' }]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                name="loan_received_in_account_id"
                label="Received In Account"
                rules={[{ required: true, message: 'Received in account is required' }]}
              >
                <Select
                  showSearch
                  placeholder="Select account"
                  options={accountOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Amount is required' }]}
          >
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
                <Select
                  options={[
                    { value: false, label: 'Not Approved' },
                    { value: true, label: 'Approved' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="active" label="Status">
                <Select
                  options={[
                    { value: true, label: 'Active' },
                    { value: false, label: 'Inactive' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

function GenericDetails({ record, formatMoney, title }) {
  const fields = Object.entries(record || {}).filter(([key, value]) => {
    if (['id', 'account', 'account_id_detail', 'items'].includes(key)) return false;
    if (Array.isArray(value)) return false;

    return true;
  });

  return (
    <DetailsCard title={`${title} Details`}>
      <InfoTable
        rows={fields.map(([key, value]) => ({
          label: humanize(key),
          value: /(amount|balance|total|debit|credit)/i.test(key)
            ? formatMoney(value)
            : relationLabel(value),
        }))}
      />
    </DetailsCard>
  );
}

export default function AccountingRecordShow({
  id,
  title,
  endpoint,
  backRoute,
  backLabel,
  titleField = 'name',
  subtitleField,
}) {
  const { token } = useToken();
  const { currency, formatMoney } = useMoneyFormatter();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  const module = moduleFromTitle(title);
  const baseEndpoint = endpoint.replace(/\/+$/, '');

  const uiVars = useMemo(
    () => ({
      '--accounting-show-bg': token.colorBgLayout,
      '--accounting-show-surface': token.colorBgContainer,
      '--accounting-show-surface-soft': token.colorFillQuaternary,
      '--accounting-show-surface-muted': token.colorFillTertiary,
      '--accounting-show-border': token.colorBorderSecondary,
      '--accounting-show-border-strong': token.colorBorder,
      '--accounting-show-text': token.colorText,
      '--accounting-show-text-secondary': token.colorTextSecondary,
      '--accounting-show-text-tertiary': token.colorTextTertiary,
      '--accounting-show-primary': token.colorPrimary,
      '--accounting-show-success': token.colorSuccess,
      '--accounting-show-warning': token.colorWarning,
      '--accounting-show-error': token.colorError,
      '--accounting-show-info': token.colorInfo,
      '--accounting-show-radius': `${token.borderRadius}px`,
      '--accounting-show-radius-lg': `${token.borderRadiusLG}px`,
      '--accounting-show-padding-xxs': `${token.paddingXXS}px`,
      '--accounting-show-padding-xs': `${token.paddingXS}px`,
      '--accounting-show-padding-sm': `${token.paddingSM}px`,
      '--accounting-show-padding': `${token.padding}px`,
      '--accounting-show-font-size-sm': `${token.fontSizeSM}px`,
      '--accounting-show-font-size': `${token.fontSize}px`,
      '--accounting-show-font-size-lg': `${token.fontSizeLG}px`,
      '--accounting-show-shadow': token.boxShadowTertiary || 'none',
      '--accounting-show-control-height-sm': `${token.controlHeightSM}px`,
    }),
    [token]
  );

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

  const recordTitle = useMemo(
    () =>
      record?.[titleField] ||
      record?.display_name ||
      record?.voucher_no ||
      record?.transfer_no ||
      record?.code ||
      title,
    [record, title, titleField]
  );

  const subtitle =
    subtitleField && record?.[subtitleField]
      ? record[subtitleField]
      : record?.code || record?.reference || '';

  const canApprove =
    record &&
    Object.prototype.hasOwnProperty.call(record, 'approved') &&
    !record.approved;

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
    if (module === 'chart') {
      return <ChartOfAccountDetails record={record} formatMoney={formatMoney} />;
    }

    if (module === 'bank') {
      return (
        <BankAccountDetails
          record={record}
          formatMoney={formatMoney}
          currency={currency}
        />
      );
    }

    if (module === 'cash') {
      return <CashTransferDetails record={record} formatMoney={formatMoney} />;
    }

    if (module === 'journal') {
      return <JournalVoucherDetails record={record} formatMoney={formatMoney} />;
    }

    if (module === 'loan') {
      return (
        <LoanAccountDetails
          record={record}
          formatMoney={formatMoney}
          onRefresh={loadRecord}
        />
      );
    }

    return <GenericDetails record={record} formatMoney={formatMoney} title={title} />;
  };

  return (
    <AuthenticatedLayout>
      <Head title={recordTitle || title} />

      <style>{`
        .accounting-show {
          min-height: calc(100vh - 64px);
          background: var(--accounting-show-bg);
          color: var(--accounting-show-text);
        }

        .accounting-show__bar {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--accounting-show-padding-sm);
          padding: 0 var(--accounting-show-padding-sm);
          background: var(--accounting-show-surface);
          border-bottom: 1px solid var(--accounting-show-border);
        }

        .accounting-show__crumb {
          display: flex;
          align-items: center;
          gap: var(--accounting-show-padding-xs);
          min-width: 0;
        }

        .accounting-show__body {
          display: grid;
          grid-template-columns: 232px minmax(0, 1fr);
          gap: var(--accounting-show-padding-xs);
        }

        .accounting-show__rail {
          background: var(--accounting-show-surface);
          border-right: 1px solid var(--accounting-show-border);
          min-height: calc(100vh - 108px);
          padding: var(--accounting-show-padding-sm);
        }

        .accounting-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--accounting-show-padding-xs);
          padding-bottom: var(--accounting-show-padding-sm);
          border-bottom: 1px solid var(--accounting-show-border);
        }

        .accounting-show__entity-text {
          min-width: 0;
        }

        .accounting-show__entity-text h4 {
          margin: 0 !important;
          font-size: var(--accounting-show-font-size) !important;
          line-height: 1.25 !important;
          color: var(--accounting-show-text) !important;
          word-break: break-word;
        }

        .accounting-show__entity-text .ant-typography {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__icon {
          width: 34px;
          height: 34px;
          border: 1px solid color-mix(in srgb, var(--module-color) 32%, var(--accounting-show-border));
          border-radius: var(--accounting-show-radius);
          display: grid;
          place-items: center;
          font-size: var(--accounting-show-font-size-lg);
          flex: none;
          color: var(--module-color);
          background: color-mix(in srgb, var(--module-color) 10%, var(--accounting-show-surface));
        }

        .accounting-show__amount {
          padding: var(--accounting-show-padding-sm) 0;
          border-bottom: 1px solid var(--accounting-show-border);
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding-xxs);
        }

        .accounting-show__amount .ant-typography {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__amount strong {
          font-size: var(--accounting-show-font-size-lg);
          color: var(--accounting-show-text);
          word-break: break-word;
        }

        .accounting-show__rail-table {
          width: 100%;
          margin-top: var(--accounting-show-padding-sm);
          border-collapse: collapse;
          table-layout: fixed;
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__rail-table th {
          width: 74px;
          padding: var(--accounting-show-padding-xs);
          background: var(--accounting-show-surface-soft);
          border: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text-secondary);
          font-weight: 600;
          text-align: left;
          vertical-align: top;
        }

        .accounting-show__rail-table td {
          padding: var(--accounting-show-padding-xs);
          border: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text);
          vertical-align: top;
          word-break: break-word;
        }

        .accounting-show__main {
          padding: var(--accounting-show-padding-xs);
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding-sm);
          min-width: 0;
          overflow: hidden;
        }

        .accounting-show__card.ant-card,
        .accounting-show__metric.ant-card {
          border-radius: var(--accounting-show-radius);
          border-color: var(--accounting-show-border);
          box-shadow: none;
          background: var(--accounting-show-surface);
        }

        .accounting-show__card .ant-card-head {
          min-height: 40px;
          padding: 0 var(--accounting-show-padding-sm);
          border-bottom: 1px solid var(--accounting-show-border);
          background: var(--accounting-show-surface);
        }

        .accounting-show__card .ant-card-head-title {
          font-size: var(--accounting-show-font-size-sm);
          font-weight: 700;
          color: var(--accounting-show-text);
        }

        .accounting-show__card .ant-card-extra {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__card .ant-card-body {
          padding: var(--accounting-show-padding-sm);
          min-width: 0;
        }

        .accounting-show__metric .ant-card-body {
          min-height: 86px;
          padding: var(--accounting-show-padding-sm);
          display: flex;
          flex-direction: column;
          gap: var(--accounting-show-padding-xxs);
        }

        .accounting-show__metric strong {
          font-size: var(--accounting-show-font-size-lg);
          font-weight: 650;
          color: var(--metric-color);
        }

        .accounting-show__info-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: var(--accounting-show-font-size-sm);
          border: 1px solid var(--accounting-show-border);
        }

        .accounting-show__info-table th {
          width: 15%;
          padding: var(--accounting-show-padding-xs) var(--accounting-show-padding-sm);
          background: var(--accounting-show-surface-soft);
          border: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text-secondary);
          font-weight: 600;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .accounting-show__info-table td {
          width: 35%;
          padding: var(--accounting-show-padding-xs) var(--accounting-show-padding-sm);
          background: var(--accounting-show-surface);
          border: 1px solid var(--accounting-show-border);
          color: var(--accounting-show-text);
          vertical-align: top;
          word-break: break-word;
        }

        .accounting-show .ant-table {
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show .ant-table-wrapper .ant-table-thead > tr > th {
          padding: var(--accounting-show-padding-xs) var(--accounting-show-padding-sm) !important;
          background: var(--accounting-show-surface-muted) !important;
          font-weight: 700;
          color: var(--accounting-show-text);
          white-space: nowrap;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show .ant-table-wrapper .ant-table-tbody > tr > td {
          padding: var(--accounting-show-padding-xs) var(--accounting-show-padding-sm) !important;
          vertical-align: middle;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show .ant-table-wrapper .ant-table-summary > tr > td {
          padding: var(--accounting-show-padding-xs) var(--accounting-show-padding-sm) !important;
          background: var(--accounting-show-surface-soft);
          font-weight: 700;
          border-color: var(--accounting-show-border) !important;
        }

        .accounting-show .ant-table-wrapper .ant-table-container {
          border-color: var(--accounting-show-border);
        }

        .accounting-show .ant-tag {
          margin-inline-end: 0;
          font-size: var(--accounting-show-font-size-sm);
          line-height: 18px;
          padding-inline: var(--accounting-show-padding-xs);
          border-radius: var(--accounting-show-radius);
        }

        .accounting-show .ant-tabs-nav {
          margin-bottom: var(--accounting-show-padding-xs) !important;
        }

        .accounting-show .ant-tabs-tab {
          padding: var(--accounting-show-padding-xs) 0 !important;
          font-size: var(--accounting-show-font-size-sm);
        }

        .accounting-show__filters {
          margin-bottom: var(--accounting-show-padding-sm);
        }

        .accounting-show__spaced-table {
          margin-top: var(--accounting-show-padding-sm);
        }

        .accounting-show__state {
          padding: var(--accounting-show-padding);
        }

        @media (max-width: 992px) {
          .accounting-show__body {
            grid-template-columns: 1fr;
          }

          .accounting-show__rail {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid var(--accounting-show-border);
          }

          .accounting-show__info-table {
            min-width: 760px;
          }

          .accounting-show__card .ant-card-body {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="accounting-show" style={uiVars}>
        <div className="accounting-show__bar">
          <div className="accounting-show__crumb">
            <Link href={route(backRoute)}>
              <Button type="text" size="small" icon={<ArrowLeftOutlined />}>
                {backLabel}
              </Button>
            </Link>

            <Text ellipsis style={{ maxWidth: 420 }}>
              {loading ? title : recordTitle}
            </Text>
          </div>

          <Space size={6}>
            <Dropdown
              menu={{
                items: [
                  { key: 'edit', label: `Edit ${title}` },
                  record?.active === false
                    ? { key: 'active', label: 'Make Active' }
                    : { key: 'inactive', label: 'Make Inactive' },
                  canApprove
                    ? {
                        key: 'approve',
                        label: 'Approve',
                        icon: <CheckCircleOutlined />,
                      }
                    : null,
                ].filter(Boolean),
                onClick: ({ key }) => {
                  if (key === 'edit') openEdit();

                  if (key === 'active') {
                    updateRecord({ active: true }, `${title} activated`);
                  }

                  if (key === 'inactive') {
                    updateRecord({ active: false }, `${title} inactivated`);
                  }

                  if (key === 'approve') {
                    updateRecord(
                      {
                        approved: true,
                        status:
                          record?.status === 'draft'
                            ? 'posted'
                            : record?.status,
                      },
                      `${title} approved`
                    );
                  }
                },
              }}
              trigger={['click']}
            >
              <Button size="small">
                Options <MoreOutlined />
              </Button>
            </Dropdown>

            <Button
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={() => router.visit(route(backRoute))}
            />
          </Space>
        </div>

        {loading ? (
          <div className="accounting-show__state">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : !record ? (
          <div className="accounting-show__state">
            <Empty description={`${title} not found`} />
          </div>
        ) : (
          <div className="accounting-show__body">
            <SummaryRail
              module={module}
              record={record}
              recordTitle={recordTitle}
              subtitle={subtitle}
              title={title}
              formatMoney={formatMoney}
              token={token}
            />

            <main className="accounting-show__main">
              {canApprove && module !== 'cash' ? (
                <Alert
                  showIcon
                  type="warning"
                  message={`${title} is not approved yet.`}
                  action={
                    <Button
                      size="small"
                      type="primary"
                      onClick={() =>
                        updateRecord({ approved: true }, `${title} approved`)
                      }
                    >
                      Approve
                    </Button>
                  }
                />
              ) : null}

              {record?.active === false && module === 'bank' ? (
                <Alert
                  showIcon
                  type="warning"
                  message="This bank account is inactive."
                  action={
                    <Button
                      size="small"
                      type="primary"
                      onClick={() =>
                        updateRecord({ active: true }, 'Bank account activated')
                      }
                    >
                      Make Active
                    </Button>
                  }
                />
              ) : null}

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
        onOk={() =>
          form
            .validateFields()
            .then((values) => updateRecord(values, `${title} updated`))
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {module === 'chart' ? (
            <>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item name="active" label="Status">
                <Select
                  options={[
                    { value: true, label: 'Active' },
                    { value: false, label: 'Inactive' },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}

          {module === 'bank' ? (
            <>
              <Form.Item
                name="display_name"
                label="Display Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item name="bank_name" label="Bank Name">
                <Input />
              </Form.Item>

              <Form.Item name="account_name" label="Account Name">
                <Input />
              </Form.Item>

              <Form.Item name="account_number" label="Account Number">
                <Input />
              </Form.Item>

              <Form.Item name="account_type" label="Account Type">
                <Input />
              </Form.Item>

              <Form.Item name="swift_code" label="Swift Code">
                <Input />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}

          {module === 'cash' ? (
            <>
              <Form.Item name="reference" label="Reference">
                <Input />
              </Form.Item>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'posted', label: 'Posted' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}

          {module === 'journal' ? (
            <>
              <Form.Item name="reference" label="Reference">
                <Input />
              </Form.Item>

              <Form.Item name="narration" label="Narration">
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item name="status" label="Status">
                <Select
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'posted', label: 'Posted' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </Form.Item>
            </>
          ) : null}

          {module === 'loan' ? (
            <>
              <Form.Item
                name="name"
                label="Loan Account Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item name="bank_name" label="Lender Bank">
                <Input />
              </Form.Item>

              <Form.Item name="loan_number" label="Loan Number">
                <Input />
              </Form.Item>

              <Form.Item name="opening_balance" label="Opening Balance">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="current_balance" label="Current Balance">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </AuthenticatedLayout>
  );
}