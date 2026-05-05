import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import { Button, Card, Descriptions, Skeleton, Space, Statistic, Tabs, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, DollarOutlined, PlusCircleOutlined, TagsOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';

const { Title, Text } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const clean = (value) => (value === '' || value === undefined ? null : value);
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateOnly = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : value;
};

const relationLabel = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (!value) continue;
    if (typeof value === 'string') return value;
    return value.label || [value.code, value.name || value.display_name].filter(Boolean).join(' - ') || value.name || value.id || '-';
  }

  return '-';
};

export default function LoanAccountShow({ id }) {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLoan = async () => {
    setLoading(true);
    try {
      const response = await axios.get(api(`/api/loan-accounts/${id}/`));
      setLoan(response.data?.data ?? response.data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to load loan account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoan();
  }, [id]);

  const accountFk = useMemo(() => ({
    type: 'fkSelect',
    fkUrl: api('/api/accounts/'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    fkLabel: (row) => [row?.code, row?.name || row?.display_name].filter(Boolean).join(' - ') || row?.name || '',
  }), []);

  const topUpColumns = useMemo(() => [
    { title: 'Date', dataIndex: 'topup_date', key: 'topup_date', backendSort: true, sortField: 'topup_date', render: (value) => dateOnly(value) || '-' },
    { title: 'Received In', key: 'loan_received_in_account_id', render: (_, record) => relationLabel(record, 'loanReceivedInAccount', 'loan_received_in_account', 'loan_received_in_account_id_detail') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', backendSort: true, sortField: 'amount', render: (value) => money(value) },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (value) => value || '-' },
    { title: 'Active', dataIndex: 'active', key: 'active', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Active' : 'Inactive'}</Tag> },
  ], []);

  const chargeColumns = useMemo(() => [
    { title: 'Date', dataIndex: 'charge_date', key: 'charge_date', backendSort: true, sortField: 'charge_date', render: (value) => dateOnly(value) || '-' },
    { title: 'Charge', dataIndex: 'charge_name', key: 'charge_name', backendSort: true, sortField: 'charge_name', render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Paid From', key: 'charges_paid_from_account_id', render: (_, record) => relationLabel(record, 'chargesPaidFromAccount', 'charges_paid_from_account', 'charges_paid_from_account_id_detail') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', backendSort: true, sortField: 'amount', render: (value) => money(value) },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (value) => value || '-' },
  ], []);

  const topUpFields = useMemo(() => [
    { name: 'loan_account_id', label: 'Loan Account', type: 'fkSelect', readOnly: true, col: 12, fkUrl: api('/api/loan-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'topup_date', label: 'Top Up Date', type: 'date', required: true, col: 12 },
    { name: 'loan_received_in_account_id', label: 'Loan Received In', required: true, col: 12, ...accountFk },
    { name: 'amount', label: 'Amount', type: 'number', required: true, col: 12 },
    { name: 'reference', label: 'Reference', type: 'text', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, col: 24 },
  ], [accountFk]);

  const chargeFields = useMemo(() => [
    { name: 'loan_account_id', label: 'Loan Account', type: 'fkSelect', readOnly: true, col: 12, fkUrl: api('/api/loan-accounts/'), fkSearchParam: 'search', fkPageSize: 20, fkValueKey: 'id', fkLabelKey: 'name' },
    { name: 'charge_name', label: 'Charge Name', type: 'text', required: true, col: 12 },
    { name: 'charge_date', label: 'Charge Date', type: 'date', required: true, col: 12 },
    { name: 'amount', label: 'Amount', type: 'number', required: true, col: 12 },
    { name: 'charges_paid_from_account_id', label: 'Paid From Account', required: true, col: 12, ...accountFk },
    { name: 'reference', label: 'Reference', type: 'text', col: 12 },
    { name: 'active', label: 'Active', type: 'switch', col: 12 },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, col: 24 },
  ], [accountFk]);

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <AuthenticatedLayout>
      <Head title={loan?.name || 'Loan Account'} />
      <div style={{ padding: 18 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link href={route('accounting.loan-accounts.index')}>Back to loan accounts</Link>
          </Button>

          <Card>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>{loan?.name || 'Loan Account'}</Title>
                    <Text type="secondary">{loan?.bank_name || 'No lender bank'}{loan?.loan_number ? ` · ${loan.loan_number}` : ''}</Text>
                  </div>
                  <Tag color={loan?.status === 'active' ? 'green' : loan?.status === 'cancelled' ? 'red' : 'blue'}>
                    {String(loan?.status || 'active').toUpperCase()}
                  </Tag>
                </Space>

                <Space wrap size={16}>
                  <Card size="small"><Statistic prefix={<DollarOutlined />} title="Opening Balance" value={Number(loan?.opening_balance || 0)} precision={2} /></Card>
                  <Card size="small"><Statistic prefix={<DollarOutlined />} title="Current Balance" value={Number(loan?.current_balance || 0)} precision={2} /></Card>
                  <Card size="small"><Statistic title="Interest" value={Number(loan?.interest_rate_per_annum || 0)} suffix="%" /></Card>
                  <Card size="small"><Statistic title="Duration" value={Number(loan?.duration_in_month || 0)} suffix="months" /></Card>
                </Space>
              </Space>
            )}
          </Card>

          {!loading && loan ? (
            <Card title="Loan Details">
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Loan Received In">{relationLabel(loan, 'loanReceivedInAccount', 'loan_received_in_account', 'loan_received_in_account_id_detail')}</Descriptions.Item>
                <Descriptions.Item label="Liability Account">{relationLabel(loan, 'relatedAccount', 'related_account', 'related_account_id_detail')}</Descriptions.Item>
                <Descriptions.Item label="Processing Fee">{money(loan.processing_fee)}</Descriptions.Item>
                <Descriptions.Item label="Processing Fee Paid From">{relationLabel(loan, 'processingFeePaidFromAccount', 'processing_fee_paid_from_account', 'processing_fee_paid_from_account_id_detail')}</Descriptions.Item>
                <Descriptions.Item label="Balance As Of">{dateOnly(loan.balance_as_of) || '-'}</Descriptions.Item>
                <Descriptions.Item label="Active">{loan.active !== false ? 'Yes' : 'No'}</Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>{loan.description || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          ) : null}

          <Tabs
            items={[
              {
                key: 'topups',
                label: 'Loan Top Ups',
                children: (
                  <ReusableCrud
                    key={`loan-top-ups-${id}`}
                    icon={<PlusCircleOutlined />}
                    title="Loan Top Ups"
                    apiUrl={api('/api/loan-top-ups/')}
                    baseFilters={{ loan_account_id: id }}
                    columns={topUpColumns}
                    fields={topUpFields}
                    validationSchema={Yup.object({
                      topup_date: Yup.string().required('Top up date is required'),
                      loan_received_in_account_id: Yup.string().required('Received in account is required'),
                      amount: Yup.number().min(0.01).required('Amount is required'),
                    })}
                    crudInitialValues={{
                      loan_account_id: id,
                      topup_date: today,
                      loan_received_in_account_id: null,
                      amount: 0,
                      reference: '',
                      notes: '',
                      active: true,
                    }}
                    transformPayload={(values) => ({
                      loan_account_id: id,
                      topup_date: dateOnly(values.topup_date),
                      loan_received_in_account_id: values.loan_received_in_account_id || null,
                      amount: Number(values.amount || 0),
                      reference: clean(values.reference?.trim()),
                      notes: clean(values.notes?.trim()),
                      active: values.active !== false,
                    })}
                    form_ui="drawer"
                    drawerWidth={820}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
              {
                key: 'charges',
                label: 'Loan Charges',
                children: (
                  <ReusableCrud
                    key={`loan-charges-${id}`}
                    icon={<TagsOutlined />}
                    title="Loan Charges"
                    apiUrl={api('/api/loan-charges/')}
                    baseFilters={{ loan_account_id: id }}
                    columns={chargeColumns}
                    fields={chargeFields}
                    validationSchema={Yup.object({
                      charge_name: Yup.string().required('Charge name is required'),
                      charge_date: Yup.string().required('Charge date is required'),
                      amount: Yup.number().min(0.01).required('Amount is required'),
                      charges_paid_from_account_id: Yup.string().required('Paid from account is required'),
                    })}
                    crudInitialValues={{
                      loan_account_id: id,
                      charge_name: '',
                      charge_date: today,
                      amount: 0,
                      charges_paid_from_account_id: null,
                      reference: '',
                      notes: '',
                      active: true,
                    }}
                    transformPayload={(values) => ({
                      loan_account_id: id,
                      charge_name: clean(values.charge_name?.trim()),
                      charge_date: dateOnly(values.charge_date),
                      amount: Number(values.amount || 0),
                      charges_paid_from_account_id: values.charges_paid_from_account_id || null,
                      reference: clean(values.reference?.trim()),
                      notes: clean(values.notes?.trim()),
                      active: values.active !== false,
                    })}
                    form_ui="drawer"
                    drawerWidth={820}
                    enableServerPagination
                    showSearch
                    canAdd
                    canEdit
                    canDelete
                    hasActions
                    hasActionColumns
                  />
                ),
              },
            ]}
          />
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
