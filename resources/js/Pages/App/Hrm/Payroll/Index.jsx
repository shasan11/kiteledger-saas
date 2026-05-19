import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  AuditOutlined,
  BankOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const listFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const apiErrorMessage = (error, fallback = 'Something went wrong.') => {
  const data = error?.response?.data;

  if (data?.message) return data.message;

  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const first = data.errors[firstKey];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
  }

  if (data && typeof data === 'object') {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return first[0];
    if (typeof first === 'string') return first;
  }

  return error?.message || fallback;
};

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const statusColor = {
  draft: 'default',
  generated: 'processing',
  approved: 'green',
  processed: 'blue',
  paid: 'cyan',
  locked: 'purple',
  void: 'red',
};

const statusLabel = {
  draft: 'Draft',
  generated: 'Generated',
  approved: 'Approved',
  processed: 'Processed',
  paid: 'Paid',
  locked: 'Locked',
  void: 'Void',
};

const SALARY_COMPONENT_TYPES = {
  earning: {
    label: 'Earning',
    pluralLabel: 'Earnings',
    color: 'green',
    icon: <PlusCircleOutlined />,
  },
  deduction: {
    label: 'Deduction',
    pluralLabel: 'Deductions',
    color: 'red',
    icon: <MinusCircleOutlined />,
  },
  employer_contribution: {
    label: 'Employer Contribution',
    pluralLabel: 'Employer Contributions',
    color: 'blue',
    icon: <BankOutlined />,
  },
};

const CALCULATION_TYPES = {
  fixed: {
    label: 'Fixed',
    color: 'default',
  },
  percentage: {
    label: 'Percentage',
    color: 'purple',
  },
  formula: {
    label: 'Formula',
    color: 'cyan',
  },
  manual: {
    label: 'Manual',
    color: 'orange',
  },
};

const salaryComponentTypeOptions = Object.entries(SALARY_COMPONENT_TYPES).map(
  ([value, item]) => ({ value, label: item.label }),
);

const calculationTypeOptions = Object.entries(CALCULATION_TYPES).map(
  ([value, item]) => ({ value, label: item.label }),
);

const salaryComponentAnchors = [
  { key: 'all', label: 'All Components', params: {} },
  { key: 'earning', label: 'Earnings', params: { type: 'earning' } },
  { key: 'deduction', label: 'Deductions', params: { type: 'deduction' } },
  {
    key: 'employer_contribution',
    label: 'Employer Contributions',
    params: { type: 'employer_contribution' },
  },
];

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const employeeName = (employee) => {
  if (!employee) return '-';

  return (
    [employee.first_name, employee.last_name].filter(Boolean).join(' ') ||
    employee.display_name ||
    employee.name ||
    employee.username ||
    employee.email ||
    '-'
  );
};

const periodLabel = (period) => {
  if (!period) return '-';

  const month = period.month
    ? dayjs().month(Number(period.month) - 1).format('MMMM')
    : '-';

  return `${month} ${period.year || ''}`.trim();
};

const renderSalaryComponentType = (value) => {
  const item = SALARY_COMPONENT_TYPES[value];

  if (!item) return <Tag>{value || '-'}</Tag>;

  return (
    <Tag color={item.color}>
      <Space size={4}>
        {item.icon}
        {item.label}
      </Space>
    </Tag>
  );
};

const renderCalculationType = (value) => {
  const item = CALCULATION_TYPES[value];
  return <Tag color={item?.color}>{item?.label || value || '-'}</Tag>;
};

function StatusTag({ status }) {
  return <Tag color={statusColor[status]}>{statusLabel[status] || status || '-'}</Tag>;
}

function MetricCard({ title, value, helper, icon, tone = 'default' }) {
  const { token } = theme.useToken();

  const toneMap = {
    default: [token.colorPrimary, token.colorPrimaryBg],
    success: [token.colorSuccess, token.colorSuccessBg],
    warning: [token.colorWarning, token.colorWarningBg],
    danger: [token.colorError, token.colorErrorBg],
    info: [token.colorInfo, token.colorInfoBg],
  };

  const [color, background] = toneMap[tone] || toneMap.default;

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        height: '100%',
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space align="start" size={12}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: token.borderRadiusLG,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            background,
            fontSize: 18,
          }}
        >
          {icon}
        </span>

        <Space direction="vertical" size={0}>
          <Text type="secondary">{title}</Text>
          <Text strong style={{ fontSize: 22, lineHeight: 1.25 }}>
            {typeof value === 'number' ? money(value) : value}
          </Text>
          {helper ? <Text type="secondary" style={{ fontSize: 12 }}>{helper}</Text> : null}
        </Space>
      </Space>
    </Card>
  );
}

function SalaryComponentsCrud() {
  const fields = [
    {
      type: 'group',
      label: 'Component Identity',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'name',
          label: 'Component Name',
          type: 'text',
          required: true,
          col: 12,
          placeholder: 'Basic Salary, House Rent, Tax Deduction',
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          required: true,
          col: 12,
          placeholder: 'BASIC, HRA, TAX',
        },
      ],
    },
    {
      type: 'group',
      label: 'Component Classification',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'type',
          label: 'Component Type',
          type: 'select',
          required: true,
          col: 12,
          options: salaryComponentTypeOptions,
        },
        {
          name: 'calculation_type',
          label: 'Calculation Type',
          type: 'select',
          required: true,
          col: 12,
          options: calculationTypeOptions,
        },
      ],
    },
    {
      type: 'group',
      label: 'Payroll Behavior',
      col: 24,
      accordion: false,
      children: [
        { name: 'taxable', label: 'Taxable', type: 'switch', col: 8 },
        { name: 'affects_net_salary', label: 'Affects Net Salary', type: 'switch', col: 8 },
        { name: 'active', label: 'Active', type: 'switch', col: 8 },
      ],
    },
    {
      type: 'group',
      label: 'Accounting',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'accounting_account_id',
          label: 'Accounting Account',
          type: 'fkSelect',
          col: 12,
          fkUrl: api('/api/chart-of-accounts'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          fkLabel: (row) => (row ? `${row.code ? `${row.code} - ` : ''}${row.name}` : ''),
          help: 'If empty, payroll uses default salary expense account.',
        },
        {
          name: 'sort_order',
          label: 'Sort Order',
          type: 'number',
          col: 12,
          min: 0,
          placeholder: '0',
        },
      ],
    },
  ];

  const columns = [
    {
      title: 'Component',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      backendSort: true,
      width: 240,
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record?.code || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 220,
      backendFilter: {
        title: 'Type',
        paramName: 'type',
        type: 'select',
        options: salaryComponentTypeOptions,
      },
      render: renderSalaryComponentType,
    },
    {
      title: 'Calculation',
      dataIndex: 'calculation_type',
      key: 'calculation_type',
      width: 160,
      backendFilter: {
        title: 'Calculation',
        paramName: 'calculation_type',
        type: 'select',
        options: calculationTypeOptions,
      },
      render: renderCalculationType,
    },
    {
      title: 'Accounting Account',
      key: 'accounting_account',
      width: 230,
      render: (_, record) => {
        const account = record.accounting_account || record.accountingAccount;

        return account?.name ? (
          <Tag color="blue">{account.code ? `${account.code} - ${account.name}` : account.name}</Tag>
        ) : (
          <Tag color="warning">Default Salary Expense</Tag>
        );
      },
    },
    {
      title: 'Taxable',
      dataIndex: 'taxable',
      key: 'taxable',
      width: 120,
      render: (value) => (value ? <Tag color="orange">Taxable</Tag> : <Tag>Non Taxable</Tag>),
    },
    {
      title: 'Net Salary',
      dataIndex: 'affects_net_salary',
      key: 'affects_net_salary',
      width: 150,
      render: (value) => (value ? <Tag color="green">Affects Net</Tag> : <Tag>Ignored</Tag>),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 110,
      render: (value) => (value !== false ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>),
    },
  ];

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').max(120),
    code: Yup.string().required('Code is required').max(50),
    type: Yup.string().required('Type is required').oneOf(['earning', 'deduction', 'employer_contribution']),
    calculation_type: Yup.string().required('Calculation type is required').oneOf(['fixed', 'percentage', 'formula', 'manual']),
    taxable: Yup.boolean().nullable(),
    affects_net_salary: Yup.boolean().nullable(),
    accounting_account_id: Yup.mixed().nullable(),
    sort_order: Yup.number().nullable().min(0),
    active: Yup.boolean().nullable(),
  });

  const initialValues = {
    name: '',
    code: '',
    type: 'earning',
    calculation_type: 'fixed',
    taxable: false,
    affects_net_salary: true,
    sort_order: 0,
    accounting_account_id: null,
    active: true,
  };

  const transformRecord = (record) => ({
    ...record,
    type: record?.type || 'earning',
    calculation_type: record?.calculation_type || 'fixed',
    taxable: Boolean(record?.taxable),
    affects_net_salary: record?.affects_net_salary ?? true,
    accounting_account_id:
      record?.accounting_account_id ||
      record?.accounting_account?.id ||
      record?.accountingAccount?.id ||
      null,
    sort_order: record?.sort_order ?? 0,
    active: record?.active ?? true,
  });

  const transformPayload = (values) => {
    const payload = { ...values };

    payload.name = payload.name?.trim();
    payload.code = payload.code?.trim()?.toUpperCase();
    payload.type = payload.type || 'earning';
    payload.calculation_type = payload.calculation_type || 'fixed';
    payload.taxable = Boolean(payload.taxable);
    payload.affects_net_salary = Boolean(payload.affects_net_salary);
    payload.accounting_account_id = idOf(payload.accounting_account_id);
    payload.sort_order = Number(payload.sort_order || 0);
    payload.active = payload.active !== false;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null;
    });

    return payload;
  };

  return (
    <ReusableCrud
      title="Salary Components"
      icon={<SettingOutlined />}
      apiUrl={api('/api/hrm/payroll/salary-components')}
      fields={fields}
      columns={columns}
      validationSchema={validationSchema}
      crudInitialValues={initialValues}
      transformRecord={transformRecord}
      transformPayload={transformPayload}
      anchorFilters={salaryComponentAnchors}
      defaultAnchorKey="all"
      anchorSyncWithHash
      form_ui="drawer"
      drawerWidth={760}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      sortMode="ordering"
      orderingParam="ordering"
      activeParam="active"
      enableServerPagination
      enableInactiveDrawer
      showSearch
      canAdd
      canEdit
      canDelete
      hasActions
      hasActionColumns
    />
  );
}

function PayrollSettingsCrud() {
  const chartAccountField = (name, label, help) => ({
    name,
    label,
    type: 'fkSelect',
    col: 12,
    fkUrl: api('/api/chart-of-accounts'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    fkLabel: (row) => (row ? `${row.code ? `${row.code} - ` : ''}${row.name}` : ''),
    help,
  });

  const fields = [
    {
      type: 'group',
      label: 'Accounting Defaults',
      col: 24,
      accordion: false,
      children: [
        chartAccountField('salary_expense_account_id', 'Salary Expense Account', 'Default debit account for salary expense.'),
        chartAccountField('salary_payable_account_id', 'Salary Payable Account', 'Control account used as payroll payable parent.'),
        chartAccountField('tax_payable_account_id', 'Deduction Payable Account', 'Credit account for payroll deductions.'),
        chartAccountField('benefit_payable_account_id', 'Employer Contribution Payable', 'Credit account for employer contributions.'),
      ],
    },
    {
      type: 'group',
      label: 'Currency & Calculation',
      col: 24,
      accordion: false,
      children: [
        {
          name: 'currency_id',
          label: 'Currency',
          type: 'fkSelect',
          col: 12,
          fkUrl: api('/api/currencies'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'code',
          fkLabel: (row) => row?.code || row?.name || '',
        },
        {
          name: 'daily_rate_basis',
          label: 'Daily Rate Basis',
          type: 'select',
          required: true,
          col: 12,
          options: [
            { value: 'working_days', label: 'Working Days' },
            { value: 'calendar_days', label: 'Calendar Days' },
          ],
        },
        {
          name: 'rounding_method',
          label: 'Rounding Method',
          type: 'select',
          required: true,
          col: 12,
          options: [
            { value: 'nearest', label: 'Nearest' },
            { value: 'floor', label: 'Floor' },
            { value: 'ceil', label: 'Ceil' },
          ],
        },
        { name: 'currency_precision', label: 'Currency Precision', type: 'number', col: 12, min: 0, max: 6 },
        { name: 'default_overtime_rate', label: 'Default Overtime Rate', type: 'number', col: 12, min: 0 },
        { name: 'allow_multiple_runs', label: 'Allow Multiple Runs', type: 'switch', col: 12 },
        { name: 'active', label: 'Active', type: 'switch', col: 12 },
      ],
    },
  ];

  const columns = [
    { title: 'Branch', render: (_, row) => row.branch?.name || <Text type="secondary">All branches</Text> },
    {
      title: 'Salary Expense',
      render: (_, row) => (row.salary_expense_account_id ? <Tag color="blue">Configured</Tag> : <Tag color="warning">Missing</Tag>),
    },
    {
      title: 'Salary Payable',
      render: (_, row) => (row.salary_payable_account_id ? <Tag color="blue">Configured</Tag> : <Tag color="warning">Missing</Tag>),
    },
    {
      title: 'Deduction Payable',
      render: (_, row) => (row.tax_payable_account_id ? <Tag color="blue">Configured</Tag> : <Tag color="warning">Missing</Tag>),
    },
    { title: 'Currency', render: (_, row) => row.currency?.code || row.currency?.name || '-' },
    {
      title: 'Active',
      dataIndex: 'active',
      render: (value) => <Tag color={value !== false ? 'green' : 'red'}>{value !== false ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const validationSchema = Yup.object().shape({
    daily_rate_basis: Yup.string().required('Daily rate basis is required'),
    rounding_method: Yup.string().required('Rounding method is required'),
    currency_precision: Yup.number().required('Currency precision is required').min(0).max(6),
  });

  const transformRecord = (record) => ({
    ...record,
    currency_id: record?.currency_id || record?.currency?.id || null,
    salary_expense_account_id: record?.salary_expense_account_id || null,
    salary_payable_account_id: record?.salary_payable_account_id || null,
    tax_payable_account_id: record?.tax_payable_account_id || null,
    benefit_payable_account_id: record?.benefit_payable_account_id || null,
    daily_rate_basis: record?.daily_rate_basis || 'working_days',
    rounding_method: record?.rounding_method || 'nearest',
    currency_precision: record?.currency_precision ?? 2,
    default_overtime_rate: record?.default_overtime_rate ?? 0,
    allow_multiple_runs: Boolean(record?.allow_multiple_runs),
    active: record?.active !== false,
  });

  const transformPayload = (values) => {
    const payload = { ...values };

    [
      'currency_id',
      'salary_expense_account_id',
      'salary_payable_account_id',
      'tax_payable_account_id',
      'benefit_payable_account_id',
    ].forEach((key) => {
      payload[key] = idOf(payload[key]);
    });

    payload.currency_precision = Number(payload.currency_precision ?? 2);
    payload.default_overtime_rate = payload.default_overtime_rate ?? 0;
    payload.allow_multiple_runs = Boolean(payload.allow_multiple_runs);
    payload.active = payload.active !== false;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') payload[key] = null;
    });

    return payload;
  };

  return (
    <ReusableCrud
      title="Payroll Settings"
      icon={<SettingOutlined />}
      apiUrl={api('/api/hrm/payroll/settings')}
      fields={fields}
      columns={columns}
      validationSchema={validationSchema}
      crudInitialValues={{
        daily_rate_basis: 'working_days',
        rounding_method: 'nearest',
        currency_precision: 2,
        default_overtime_rate: 0,
        allow_multiple_runs: false,
        active: true,
      }}
      transformRecord={transformRecord}
      transformPayload={transformPayload}
      form_ui="drawer"
      drawerWidth={760}
      searchParam="search"
      pageParam="page"
      pageSizeParam="page_size"
      sortMode="ordering"
      orderingParam="ordering"
      activeParam="active"
      enableServerPagination
      enableInactiveDrawer
      showSearch
      canAdd
      canEdit
      canDelete={false}
      hasActions
      hasActionColumns
    />
  );
}

function PayrollWizard({ lookups, loadingLookups, onGenerated, onQuickAddPeriod }) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const employeeScope = Form.useWatch('employee_scope', form);
  const selectedPeriodId = Form.useWatch('payroll_period_id', form);
  const selectedSourceAccountId = Form.useWatch('source_account_id', form);
  const selectedCurrencyId = Form.useWatch('currency_id', form);

  const selectedPeriod = lookups.periods.find(
    (period) => period.id === selectedPeriodId,
  );

  const selectedSourceAccount = lookups.paymentAccounts.find(
    (account) => account.id === selectedSourceAccountId,
  );

  const selectedCurrency = lookups.currencies.find(
    (currency) => currency.id === selectedCurrencyId,
  );

  const canGenerate = Boolean(selectedPeriodId && selectedCurrencyId);

  useEffect(() => {
    if (!lookups.currencies?.length) return;

    const currentCurrencyId = form.getFieldValue('currency_id');

    if (currentCurrencyId) return;

    const defaultCurrency =
      lookups.currencies.find((currency) => currency.is_base && currency.active !== false) ||
      lookups.currencies.find((currency) => currency.active !== false) ||
      lookups.currencies[0];

    if (defaultCurrency?.id) {
      form.setFieldsValue({
        currency_id: defaultCurrency.id,
        exchange_rate: Number(defaultCurrency.exchange_rate || 1),
      });
    }
  }, [lookups.currencies, form]);

  useEffect(() => {
    if (!selectedPeriod) return;

    const currentBranchId = form.getFieldValue('branch_id');

    if (!currentBranchId && selectedPeriod.branch_id) {
      form.setFieldsValue({
        branch_id: selectedPeriod.branch_id,
      });
    }
  }, [selectedPeriod, form]);

  const handleCurrencyChange = (currencyId) => {
    const currency = lookups.currencies.find((item) => item.id === currencyId);

    form.setFieldsValue({
      exchange_rate: Number(currency?.exchange_rate || 1),
    });
  };

  const generate = async () => {
    const values = await form.validateFields();

    setLoading(true);

    try {
      await axios.post(api('/api/hrm/payroll/payrolls/generate'), {
        ...values,
        payroll_period_id: idOf(values.payroll_period_id),
        branch_id: idOf(values.branch_id),
        currency_id: idOf(values.currency_id),
        exchange_rate: Number(values.exchange_rate || 1),
        source_account_id: idOf(values.source_account_id),
        department_id: idOf(values.department_id),
        employee_ids:
          values.employee_scope === 'selected'
            ? values.employee_ids || []
            : undefined,
        idempotency_key: `payroll-${values.payroll_period_id}-${values.branch_id || 'all'}-${Date.now()}`,
      });

      message.success('Payroll generated. Review it in the Payrolls tab.');

      form.resetFields();

      const defaultCurrency =
        lookups.currencies.find((currency) => currency.is_base && currency.active !== false) ||
        lookups.currencies.find((currency) => currency.active !== false) ||
        lookups.currencies[0];

      if (defaultCurrency?.id) {
        form.setFieldsValue({
          employee_scope: 'all',
          exchange_rate: Number(defaultCurrency.exchange_rate || 1),
          currency_id: defaultCurrency.id,
        });
      } else {
        form.setFieldsValue({
          employee_scope: 'all',
          exchange_rate: 1,
        });
      }

      onGenerated?.();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Payroll generation failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      bordered={false}
      title={
        <Space>
          <CalculatorOutlined />
          Create Payroll
        </Space>
      }
      extra={
        <Text type="secondary">
          Select period → choose employees → generate
        </Text>
      }
      style={{
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Alert
        showIcon
        type="info"
        message="Before generating payroll"
        description="Make sure employees have salary structure and attendance summary for the selected period. Missing employees are skipped by backend logic."
        style={{ marginBottom: 16 }}
      />

      {!lookups.currencies?.length ? (
        <Alert
          showIcon
          type="error"
          message="No currency found"
          description="Create at least one active currency or configure base currency before generating payroll."
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          employee_scope: 'all',
          exchange_rate: 1,
        }}
      >
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item label="Payroll Period" required>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  name="payroll_period_id"
                  noStyle
                  rules={[
                    {
                      required: true,
                      message: 'Select a payroll period.',
                    },
                  ]}
                >
                  <Select
                    showSearch
                    loading={loadingLookups}
                    optionFilterProp="label"
                    placeholder="Select period"
                    options={lookups.periods.map((period) => ({
                      value: period.id,
                      label: `${periodLabel(period)}${
                        period.branch?.name ? ` - ${period.branch.name}` : ''
                      }`,
                    }))}
                  />
                </Form.Item>

                <Button icon={<PlusOutlined />} onClick={onQuickAddPeriod} />
              </Space.Compact>
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="branch_id" label="Branch">
              <Select
                allowClear
                showSearch
                loading={loadingLookups}
                optionFilterProp="label"
                placeholder="All branches"
                options={lookups.branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name || branch.code || branch.id,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="currency_id"
              label="Currency"
              rules={[
                {
                  required: true,
                  message: 'Currency is required.',
                },
              ]}
            >
              <Select
                showSearch
                loading={loadingLookups}
                optionFilterProp="label"
                placeholder="Select currency"
                onChange={handleCurrencyChange}
                options={lookups.currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code || currency.name}${
                    currency.is_base ? ' - Base' : ''
                  }`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item
              name="exchange_rate"
              label="Exchange Rate"
              rules={[
                {
                  required: true,
                  message: 'Exchange rate is required.',
                },
              ]}
            >
              <InputNumber
                min={0.000001}
                precision={6}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={10}>
            <Form.Item name="source_account_id" label="Payment From Account">
              <Select
                allowClear
                showSearch
                loading={loadingLookups}
                optionFilterProp="label"
                placeholder="Required before processing payroll"
                options={lookups.paymentAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.code ? `${account.code} - ` : ''}${account.name}`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item name="employee_scope" label="Employees">
              <Select
                options={[
                  { value: 'all', label: 'All active employees' },
                  { value: 'branch', label: 'By branch' },
                  { value: 'department', label: 'By department' },
                  { value: 'selected', label: 'Selected employees' },
                ]}
              />
            </Form.Item>
          </Col>

          {employeeScope === 'department' ? (
            <Col xs={24} md={8}>
              <Form.Item
                name="department_id"
                label="Department"
                rules={[
                  {
                    required: true,
                    message: 'Select department.',
                  },
                ]}
              >
                <Select
                  showSearch
                  loading={loadingLookups}
                  optionFilterProp="label"
                  placeholder="Select department"
                  options={lookups.departments.map((department) => ({
                    value: department.id,
                    label: department.name || department.title || department.id,
                  }))}
                />
              </Form.Item>
            </Col>
          ) : null}

          {employeeScope === 'selected' ? (
            <Col xs={24} md={16}>
              <Form.Item
                name="employee_ids"
                label="Selected Employees"
                rules={[
                  {
                    required: true,
                    message: 'Select at least one employee.',
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  loading={loadingLookups}
                  optionFilterProp="label"
                  placeholder="Choose employees"
                  options={lookups.employees.map((employee) => ({
                    value: employee.id,
                    label: `${employeeName(employee)}${
                      employee.employee_id ? ` (${employee.employee_id})` : ''
                    }`,
                  }))}
                />
              </Form.Item>
            </Col>
          ) : null}
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                background: token.colorFillQuaternary,
              }}
            >
              <Space direction="vertical" size={2}>
                <Text type="secondary">Selected Period</Text>
                <Text strong>
                  {selectedPeriod ? periodLabel(selectedPeriod) : 'Not selected'}
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                background: token.colorFillQuaternary,
              }}
            >
              <Space direction="vertical" size={2}>
                <Text type="secondary">Currency</Text>
                <Text strong>
                  {selectedCurrency
                    ? `${selectedCurrency.code || selectedCurrency.name} @ ${form.getFieldValue('exchange_rate') || 1}`
                    : 'Not selected'}
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                background: token.colorFillQuaternary,
              }}
            >
              <Space direction="vertical" size={2}>
                <Text type="secondary">Payment Account</Text>
                <Text strong>
                  {selectedSourceAccount?.name || 'Can be selected later'}
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Space wrap>
          <Button
            type="primary"
            onClick={generate}
            loading={loading}
            disabled={!canGenerate}
            icon={<CalculatorOutlined />}
          >
            Generate Payroll
          </Button>

          <Button
            onClick={() => {
              form.resetFields();

              const defaultCurrency =
                lookups.currencies.find(
                  (currency) => currency.is_base && currency.active !== false,
                ) ||
                lookups.currencies.find((currency) => currency.active !== false) ||
                lookups.currencies[0];

              form.setFieldsValue({
                employee_scope: 'all',
                exchange_rate: Number(defaultCurrency?.exchange_rate || 1),
                currency_id: defaultCurrency?.id,
              });
            }}
          >
            Reset
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

function PayrollPeriodsPanel({ periods, branches, loading, onCreate, onEdit, onRefresh, style }) {
  const { token } = theme.useToken();

  return (
    <Card
      bordered={false}
      style={style}
      title={
        <Space>
          <FileDoneOutlined />
          Payroll Periods
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary">{periods.length} periods</Text>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreate()}>
            Add Period
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={periods}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: <Empty description="No payroll periods yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        columns={[
          {
            title: 'Period',
            render: (_, row) => (
              <Space direction="vertical" size={0}>
                <Text strong>{periodLabel(row)}</Text>
                <Text type="secondary">
                  {row.start_date || '-'} to {row.end_date || '-'}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Branch',
            render: (_, row) =>
              row.branch?.name ||
              branches.find((branch) => branch.id === row.branch_id)?.name ||
              <Text type="secondary">All branches</Text>,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (value) => {
              const colors = { open: 'green', closed: 'default', locked: 'purple' };
              return <Tag color={colors[value]}>{value || '-'}</Tag>;
            },
          },
          {
            title: '',
            align: 'right',
            width: 100,
            render: (_, row) => <Button size="small" onClick={() => onEdit(row)}>Edit</Button>,
          },
        ]}
        rowClassName={(row) => (row.status === 'open' ? 'payroll-period-row-open' : '')}
      />

      <style>
        {`
          .payroll-period-row-open td:first-child {
            border-left: 3px solid ${token.colorSuccess};
          }
        `}
      </style>
    </Card>
  );
}

function AdjustmentTable({ title, rows, editable, onAdd, onDelete }) {
  return (
    <Card
      size="small"
      title={title}
      extra={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={!editable}>
          Add
        </Button>
      }
    >
      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No adjustments" /> }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Calculation', dataIndex: 'calculation_type', width: 110 },
          {
            title: 'Applicability',
            dataIndex: 'applicability_type',
            width: 150,
            render: (value) => value?.replace('_', ' ') || '-',
          },
          { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: money },
          {
            title: '',
            width: 48,
            render: (_, record) => (
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={!editable}
                onClick={() => onDelete(record)}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}

export default function Payroll({ auth }) {
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [savingSourceAccount, setSavingSourceAccount] = useState(false);

  const [lookups, setLookups] = useState({
    periods: [],
    branches: [],
    currencies: [],
    accounts: [],
    paymentAccounts: [],
    components: [],
    employees: [],
    departments: [],
  });

  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [payslipDrawer, setPayslipDrawer] = useState(null);
  const [voidingPayroll, setVoidingPayroll] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [periodModal, setPeriodModal] = useState({ open: false, record: null });
  const [periodSaving, setPeriodSaving] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState(null);

  const [form] = Form.useForm();
  const [lineForm] = Form.useForm();
  const [periodForm] = Form.useForm();

  const editable = ['draft', 'generated'].includes(selectedPayroll?.status);

  const pageStyles = {
    shell: {
      padding: 16,
      minHeight: 'calc(100vh - 64px)',
      background: token.colorBgLayout,
    },
    header: {
      border: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadowTertiary,
    },
    headerInner: { padding: 18 },
    headerMeta: { color: token.colorTextSecondary, marginTop: 4, maxWidth: 760 },
    quickStat: {
      padding: '10px 12px',
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: token.borderRadius,
      background: token.colorFillQuaternary,
      minWidth: 124,
    },
    sectionCard: {
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadowTertiary,
    },
  };

  const payrollRows = dashboard?.recent_payrolls || dashboard?.recent_runs || [];

  const statusCounts = useMemo(() => {
    const seed = { generated: 0, approved: 0, processed: 0, paid: 0 };

    payrollRows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(seed, row.status)) seed[row.status] += 1;
    });

    return seed;
  }, [payrollRows]);

  const selectedEmployeeOptions = useMemo(
    () =>
      (selectedPayroll?.payslips || []).map((payslip) => ({
        value: payslip.employee_id,
        label: employeeName(payslip.employee),
      })),
    [selectedPayroll],
  );

  useEffect(() => {
    setSourceAccountId(selectedPayroll?.source_account_id || selectedPayroll?.source_account?.id || null);
  }, [selectedPayroll?.id, selectedPayroll?.source_account_id]);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const { data } = await axios.get(api('/api/hrm/payroll/dashboard'));
      setDashboard(data);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to load payroll dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    setLookupLoading(true);

    try {
      const [periods, branches, currencies, accounts, components, employees, departments] = await Promise.allSettled([
        axios.get(api('/api/hrm/payroll/periods'), { params: { page_size: 100, ordering: '-year,-month' } }),
        axios.get(api('/api/branches'), { params: { page_size: 100 } }),
        axios.get(api('/api/currencies'), { params: { page_size: 100 } }),
        axios.get(api('/api/accounts'), { params: { page_size: 300, ordering: 'name' } }),
        axios.get(api('/api/hrm/payroll/salary-components'), { params: { page_size: 100, ordering: 'sort_order,name' } }),
        axios.get(api('/api/hrm/users'), { params: { page_size: 300, active: true, ordering: 'name' } }),
        axios.get(api('/api/hrm/departments'), { params: { page_size: 100, ordering: 'name' } }),
      ]);

      const accountRows = accounts.status === 'fulfilled' ? listFromResponse(accounts.value.data) : [];

      setLookups({
        periods: periods.status === 'fulfilled' ? listFromResponse(periods.value.data) : [],
        branches: branches.status === 'fulfilled' ? listFromResponse(branches.value.data) : [],
        currencies: currencies.status === 'fulfilled' ? listFromResponse(currencies.value.data) : [],
        accounts: accountRows,
        paymentAccounts: accountRows.filter((account) => ['cash', 'bank'].includes(account.nature)),
        components: components.status === 'fulfilled' ? listFromResponse(components.value.data) : [],
        employees: employees.status === 'fulfilled' ? listFromResponse(employees.value.data) : [],
        departments: departments.status === 'fulfilled' ? listFromResponse(departments.value.data) : [],
      });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to load payroll lookup data.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadDashboard(), loadLookups()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshSelected = async (id = selectedPayroll?.id) => {
    if (!id) return;

    try {
      const { data } = await axios.get(api(`/api/hrm/payroll/payrolls/${id}`));
      setSelectedPayroll(data);

      setDashboard((previous) => {
        if (!previous) return previous;

        const rows = (previous.recent_payrolls || previous.recent_runs || []).map((payroll) =>
          payroll.id === data.id ? data : payroll,
        );

        return { ...previous, recent_payrolls: rows, recent_runs: rows };
      });
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to refresh payroll.'));
    }
  };

  const openPayroll = async (payroll) => {
    setDrawerOpen(true);
    setSelectedPayroll(payroll);
    await refreshSelected(payroll.id);
  };

  const syncPayrollAccounts = async () => {
    setSyncingAccounts(true);

    try {
      const { data } = await axios.post(api('/api/hrm/payroll/sync-accounts'));
      message.success(data?.message || `Synced ${data?.count || 0} employee payroll account(s).`);
      await refreshAll();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to sync payroll accounts.'));
    } finally {
      setSyncingAccounts(false);
    }
  };

  const openPeriodModal = (record = null) => {
    setPeriodModal({ open: true, record });

    periodForm.setFieldsValue(
      record
        ? {
            month: record.month,
            year: record.year,
            start_date: record.start_date ? dayjs(record.start_date) : null,
            end_date: record.end_date ? dayjs(record.end_date) : null,
            branch_id: record.branch_id || null,
            status: record.status || 'open',
          }
        : {
            month: dayjs().month() + 1,
            year: dayjs().year(),
            start_date: dayjs().startOf('month'),
            end_date: dayjs().endOf('month'),
            branch_id: null,
            status: 'open',
          },
    );
  };

  const closePeriodModal = () => {
    setPeriodModal({ open: false, record: null });
    periodForm.resetFields();
  };

  const handlePeriodValueChange = (changed, allValues) => {
    if (changed.month || changed.year) {
      const month = Number(allValues.month || dayjs().month() + 1) - 1;
      const year = Number(allValues.year || dayjs().year());
      const date = dayjs().year(year).month(month);

      periodForm.setFieldsValue({
        start_date: date.startOf('month'),
        end_date: date.endOf('month'),
      });
    }
  };

  const savePeriod = async () => {
    const values = await periodForm.validateFields();

    const payload = {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
      branch_id: idOf(values.branch_id),
    };

    setPeriodSaving(true);

    try {
      if (periodModal.record?.id) {
        await axios.patch(api(`/api/hrm/payroll/periods/${periodModal.record.id}`), payload);
        message.success('Payroll period updated.');
      } else {
        await axios.post(api('/api/hrm/payroll/periods'), payload);
        message.success('Payroll period created.');
      }

      closePeriodModal();
      await loadLookups();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to save payroll period.'));
    } finally {
      setPeriodSaving(false);
    }
  };

  const saveSourceAccount = async () => {
    if (!selectedPayroll?.id) return;

    setSavingSourceAccount(true);

    try {
      await axios.patch(api(`/api/hrm/payroll/payrolls/${selectedPayroll.id}`), {
        source_account_id: sourceAccountId || null,
      });

      message.success('Payment account updated.');
      await refreshSelected(selectedPayroll.id);
      await loadDashboard();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to update payment account.'));
    } finally {
      setSavingSourceAccount(false);
    }
  };

  const act = (payroll, action, label) => {
    if (action === 'process' && !payroll.source_account_id) {
      message.error('Select and save Payment From Account before processing payroll.');
      return;
    }

    if (action === 'mark-paid' && !payroll.source_account_id) {
      message.error('Payment From Account is missing.');
      return;
    }

    modal.confirm({
      title: `${label} payroll?`,
      content: `${payroll.payroll_number || payroll.run_number} will move to ${label.toLowerCase()}.`,
      okText: label,
      onOk: async () => {
        try {
          await axios.post(api(`/api/hrm/payroll/payrolls/${payroll.id}/${action}`));
          message.success(`Payroll ${label.toLowerCase()} complete.`);
          await loadDashboard();
          await refreshSelected(payroll.id);
        } catch (error) {
          message.error(apiErrorMessage(error, `Unable to ${label.toLowerCase()} payroll.`));
          throw error;
        }
      },
    });
  };

  const saveAdjustment = async () => {
    const values = await form.validateFields();

    try {
      await axios.post(api(`/api/hrm/payroll/payrolls/${selectedPayroll.id}/${adjustmentModal}`), values);
      message.success(`${adjustmentModal === 'addition' ? 'Addition' : 'Deduction'} applied.`);
      setAdjustmentModal(null);
      form.resetFields();
      await refreshSelected();
      await loadDashboard();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to save payroll adjustment.'));
    }
  };

  const deleteAdjustment = async (kind, row) => {
    try {
      await axios.delete(api(`/api/hrm/payroll/payrolls/${selectedPayroll.id}/${kind}/${row.id}`));
      message.success('Adjustment deleted.');
      await refreshSelected();
      await loadDashboard();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to delete adjustment.'));
    }
  };

  const savePayslipLine = async () => {
    const values = await lineForm.validateFields();
    const source = values.type === 'earning' ? 'payslip_manual_addition' : 'payslip_manual_deduction';

    try {
      const { data } = await axios.post(api('/api/hrm/payroll/payslip-lines'), {
        ...values,
        source,
        payslip_id: payslipDrawer.id,
      });

      message.success('Payslip line added.');
      setPayslipDrawer(data);
      lineForm.resetFields();
      await refreshSelected();
      await loadDashboard();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to add payslip line.'));
    }
  };

  const deletePayslipLine = async (line) => {
    try {
      const { data } = await axios.delete(api(`/api/hrm/payroll/payslip-lines/${line.id}`));
      message.success('Payslip line deleted.');
      setPayslipDrawer(data);
      await refreshSelected();
      await loadDashboard();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Unable to delete payslip line.'));
    }
  };

  const payrollColumns = [
    {
      title: 'Payroll #',
      dataIndex: 'payroll_number',
      width: 170,
      render: (value, record) => <Text strong>{value || record.run_number}</Text>,
    },
    {
      title: 'Period',
      width: 140,
      render: (_, record) => periodLabel(record.payroll_period),
    },
    { title: 'Employees', dataIndex: 'total_employees', align: 'right', width: 100 },
    { title: 'Earnings', dataIndex: 'total_earnings', align: 'right', render: money },
    { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
    {
      title: 'Net Payable',
      dataIndex: 'total_net_payable',
      align: 'right',
      render: (value) => <Text strong>{money(value)}</Text>,
    },
    {
      title: 'Payment Account',
      render: (_, record) => record.source_account?.name || <Tag color="warning">Not selected</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: 'JV',
      width: 130,
      render: (_, record) =>
        record.journal_voucher?.voucher_no ? (
          <Tag color="green">{record.journal_voucher.voucher_no}</Tag>
        ) : (
          <Tag color="warning">Not posted</Tag>
        ),
    },
    {
      title: '',
      width: 80,
      render: (_, record) => <Button size="small" type="link" onClick={() => openPayroll(record)}>Open</Button>,
    },
  ];

  const payslipColumns = [
    {
      title: 'Employee',
      width: 190,
      render: (_, payslip) => <Text strong>{employeeName(payslip.employee)}</Text>,
    },
    { title: 'Basic Salary', dataIndex: 'salary', align: 'right', width: 120, render: money },
    { title: 'Earnings', dataIndex: 'gross_earnings', align: 'right', render: money },
    { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
    {
      title: 'Net Payable',
      dataIndex: 'net_payable',
      align: 'right',
      render: (value) => <Text strong>{money(value)}</Text>,
    },
    {
      title: 'Payroll Account',
      render: (_, payslip) => {
        const account = payslip.employee?.payroll_account || payslip.employee?.payrollAccount;
        const chartAccounts = account?.chart_of_accounts || account?.chartOfAccounts || [];

        return account?.name ? (
          <Space direction="vertical" size={0}>
            <Text>{account.name}</Text>
            {chartAccounts.length === 0 ? <Tag color="warning">Missing COA link</Tag> : null}
          </Space>
        ) : (
          <Tag color="warning">Missing</Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (value) => <StatusTag status={value} />,
    },
    {
      title: '',
      width: 90,
      render: (_, payslip) => <Button size="small" onClick={() => setPayslipDrawer(payslip)}>Payslip</Button>,
    },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Payroll" />

      <div style={pageStyles.shell}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={pageStyles.header} bodyStyle={pageStyles.headerInner}>
            <Row align="middle" gutter={[16, 16]}>
              <Col flex="auto">
                <Space direction="vertical" size={2}>
                  <Title level={3} style={{ margin: 0 }}>Payroll</Title>
                  <Text style={pageStyles.headerMeta}>
                    Generate payroll, review payslips, apply additions/deductions, post the journal voucher, and settle salaries from the selected payment account.
                  </Text>
                </Space>
              </Col>

              <Col>
                <Space wrap>
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} style={pageStyles.quickStat}>
                      <Text type="secondary" style={{ display: 'block', textTransform: 'capitalize' }}>{status}</Text>
                      <Space size={6}>
                        <Tag color={statusColor[status]}>{count}</Tag>
                        <Text strong>{count === 1 ? 'payroll' : 'payrolls'}</Text>
                      </Space>
                    </div>
                  ))}

                  <Button icon={<PlusOutlined />} onClick={() => openPeriodModal()}>
                    Add Period
                  </Button>

                  <Button icon={<ReloadOutlined />} loading={syncingAccounts} onClick={syncPayrollAccounts}>
                    Sync Accounts
                  </Button>

                  <Button icon={<ReloadOutlined />} loading={loading || lookupLoading} onClick={refreshAll}>
                    Refresh
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Employees Included" value={dashboard?.employees_included || 0} helper="Across recent payrolls" icon={<TeamOutlined />} tone="info" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Gross Payroll" value={dashboard?.gross_payroll || 0} helper="Before deductions" icon={<DollarOutlined />} tone="success" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Deductions" value={dashboard?.total_deductions || 0} helper="Tax, benefits, and deductions" icon={<AuditOutlined />} tone="warning" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Net Payable" value={dashboard?.net_payable || 0} helper="Salary to pay" icon={<BankOutlined />} tone="default" />
            </Col>
          </Row>

          <Tabs
            items={[
              {
                key: 'generate',
                label: 'Create Payroll',
                icon: <PlusOutlined />,
                children: (
                  <PayrollWizard
                    lookups={lookups}
                    loadingLookups={lookupLoading}
                    onGenerated={refreshAll}
                    onQuickAddPeriod={() => openPeriodModal()}
                  />
                ),
              },
              {
                key: 'payrolls',
                label: 'Payrolls',
                icon: <CheckCircleOutlined />,
                children: (
                  <Card
                    bordered={false}
                    style={pageStyles.sectionCard}
                    title={<Space><CheckCircleOutlined />Payroll Register</Space>}
                    extra={<Text type="secondary">{payrollRows.length} recent records</Text>}
                  >
                    <Table
                      size="middle"
                      rowKey="id"
                      columns={payrollColumns}
                      dataSource={payrollRows}
                      loading={loading}
                      pagination={{ pageSize: 10, showSizeChanger: false }}
                      scroll={{ x: 1120 }}
                      locale={{ emptyText: <Empty description="No payroll generated yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                  </Card>
                ),
              },
              {
                key: 'periods',
                label: 'Periods',
                icon: <FileDoneOutlined />,
                children: (
                  <PayrollPeriodsPanel
                    periods={lookups.periods}
                    branches={lookups.branches}
                    loading={lookupLoading}
                    onCreate={() => openPeriodModal()}
                    onEdit={openPeriodModal}
                    onRefresh={loadLookups}
                    style={pageStyles.sectionCard}
                  />
                ),
              },
              { key: 'components', label: 'Components', icon: <SettingOutlined />, children: <SalaryComponentsCrud /> },
              { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: <PayrollSettingsCrud /> },
            ]}
          />
        </Space>
      </div>

      <Drawer
        title={
          selectedPayroll ? (
            <Space>
              <Text strong>{selectedPayroll.payroll_number || selectedPayroll.run_number}</Text>
              <StatusTag status={selectedPayroll.status} />
            </Space>
          ) : 'Payroll'
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={1180}
        extra={
          selectedPayroll && (
            <Space wrap>
              {selectedPayroll.status === 'generated' && (
                <Button type="primary" onClick={() => act(selectedPayroll, 'approve', 'Approve')}>Approve</Button>
              )}
              {selectedPayroll.status === 'approved' && (
                <Button type="primary" onClick={() => act(selectedPayroll, 'process', 'Process')}>Process</Button>
              )}
              {selectedPayroll.status === 'processed' && (
                <Button onClick={() => act(selectedPayroll, 'mark-paid', 'Mark Paid')}>Mark Paid</Button>
              )}
              {selectedPayroll.status === 'paid' && (
                <Button onClick={() => act(selectedPayroll, 'lock', 'Lock')}>Lock</Button>
              )}
              {['generated', 'approved'].includes(selectedPayroll.status) && (
                <Button danger onClick={() => setVoidingPayroll(selectedPayroll)}>Void</Button>
              )}
            </Space>
          )
        }
      >
        {selectedPayroll ? (
          <Space direction="vertical" size={12} style={{ display: 'flex' }}>
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 4 }}>
              <Descriptions.Item label="Payroll Period">{periodLabel(selectedPayroll.payroll_period)}</Descriptions.Item>
              <Descriptions.Item label="Branch">{selectedPayroll.branch?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Currency">{selectedPayroll.currency?.code || selectedPayroll.currency?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Exchange Rate">{selectedPayroll.exchange_rate || '-'}</Descriptions.Item>
              <Descriptions.Item label="Journal Voucher">{selectedPayroll.journal_voucher?.voucher_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag status={selectedPayroll.status} /></Descriptions.Item>
            </Descriptions>

            <Card size="small" title={<Space><WalletOutlined />Payment Account</Space>}>
              <Row gutter={12} align="middle">
                <Col xs={24} md={14}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Select cash/bank account"
                    value={sourceAccountId}
                    onChange={setSourceAccountId}
                    style={{ width: '100%' }}
                    disabled={['paid', 'locked', 'void'].includes(selectedPayroll.status)}
                    options={lookups.paymentAccounts.map((account) => ({
                      value: account.id,
                      label: `${account.code ? `${account.code} - ` : ''}${account.name}`,
                    }))}
                  />
                </Col>
                <Col xs={24} md={10}>
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={saveSourceAccount}
                      loading={savingSourceAccount}
                      disabled={['paid', 'locked', 'void'].includes(selectedPayroll.status)}
                    >
                      Save Account
                    </Button>
                    {!selectedPayroll.source_account_id ? <Tag color="warning">Required before processing</Tag> : <Tag color="green">Ready</Tag>}
                  </Space>
                </Col>
              </Row>
            </Card>

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}><Statistic title="Employees" value={selectedPayroll.total_employees || 0} /></Col>
              <Col xs={12} sm={6}><Statistic title="Earnings" value={money(selectedPayroll.total_earnings)} /></Col>
              <Col xs={12} sm={6}><Statistic title="Deductions" value={money(selectedPayroll.total_deductions)} /></Col>
              <Col xs={12} sm={6}><Statistic title="Net Payable" value={money(selectedPayroll.total_net_payable)} valueStyle={{ color: token.colorPrimary }} /></Col>
            </Row>

            <Table
              rowKey="id"
              size="small"
              dataSource={selectedPayroll.payslips || []}
              columns={payslipColumns}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 980 }}
              locale={{ emptyText: <Empty description="No payslips found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={12}>
                <AdjustmentTable
                  title="Payroll Additions"
                  rows={selectedPayroll.additions || []}
                  editable={editable}
                  onAdd={() => setAdjustmentModal('addition')}
                  onDelete={(row) => deleteAdjustment('addition', row)}
                />
              </Col>
              <Col xs={24} lg={12}>
                <AdjustmentTable
                  title="Payroll Deductions"
                  rows={selectedPayroll.deductions || []}
                  editable={editable}
                  onAdd={() => setAdjustmentModal('deduction')}
                  onDelete={(row) => deleteAdjustment('deduction', row)}
                />
              </Col>
            </Row>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title={adjustmentModal === 'addition' ? 'Add Payroll Addition' : 'Add Payroll Deduction'}
        open={Boolean(adjustmentModal)}
        onCancel={() => {
          setAdjustmentModal(null);
          form.resetFields();
        }}
        onOk={saveAdjustment}
        okText="Apply"
      >
        <Form form={form} layout="vertical" initialValues={{ calculation_type: 'fixed', applicability_type: 'all_employees' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required.' }]}><Input /></Form.Item>
          <Form.Item name="component_id" label="Component">
            <Select allowClear showSearch optionFilterProp="label" options={lookups.components.map((component) => ({ value: component.id, label: component.name }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required.' }]}>
                <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="calculation_type" label="Calculation" rules={[{ required: true }]}>
                <Select options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="applicability_type" label="Applicability" rules={[{ required: true }]}>
            <Select options={[{ value: 'all_employees', label: 'All employees' }, { value: 'selected_employees', label: 'Selected employees' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, next) => previous.applicability_type !== next.applicability_type}>
            {({ getFieldValue }) =>
              getFieldValue('applicability_type') === 'selected_employees' ? (
                <Form.Item name="selected_employee_ids" label="Employees" rules={[{ required: true, message: 'Select employees.' }]}>
                  <Select mode="multiple" showSearch optionFilterProp="label" options={selectedEmployeeOptions} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={periodModal.record ? 'Edit Payroll Period' : 'Add Payroll Period'}
        open={periodModal.open}
        onCancel={closePeriodModal}
        onOk={savePeriod}
        confirmLoading={periodSaving}
        okText={periodModal.record ? 'Save Period' : 'Create Period'}
        width={640}
      >
        <Form form={periodForm} layout="vertical" onValuesChange={handlePeriodValueChange}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="month" label="Month" rules={[{ required: true, message: 'Month is required.' }]}>
                <Select options={Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: dayjs().month(index).format('MMMM') }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="year" label="Year" rules={[{ required: true, message: 'Year is required.' }]}>
                <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true, message: 'End date is required.' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="branch_id" label="Branch">
                <Select allowClear showSearch optionFilterProp="label" placeholder="All branches" options={lookups.branches.map((branch) => ({ value: branch.id, label: branch.name || branch.code || branch.id }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required.' }]}>
                <Select options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'locked', label: 'Locked' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={payslipDrawer ? `Payslip - ${employeeName(payslipDrawer.employee)}` : 'Payslip'}
        open={Boolean(payslipDrawer)}
        onClose={() => setPayslipDrawer(null)}
        width={900}
      >
        {payslipDrawer ? (
          <Space direction="vertical" size={12} style={{ display: 'flex' }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Employee">{employeeName(payslipDrawer.employee)}</Descriptions.Item>
              <Descriptions.Item label="Payroll Account">
                {payslipDrawer.employee?.payroll_account?.name || payslipDrawer.employee?.payrollAccount?.name || <Tag color="warning">Missing</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Payable Days">{payslipDrawer.payable_days || '-'}</Descriptions.Item>
              <Descriptions.Item label="Overtime Hours">{payslipDrawer.overtime_hours || '-'}</Descriptions.Item>
              <Descriptions.Item label="Earnings">{money(payslipDrawer.gross_earnings)}</Descriptions.Item>
              <Descriptions.Item label="Deductions">{money(payslipDrawer.total_deductions)}</Descriptions.Item>
              <Descriptions.Item label="Net Payable"><Text strong>{money(payslipDrawer.net_payable)}</Text></Descriptions.Item>
            </Descriptions>

            <Table
              size="small"
              rowKey="id"
              dataSource={payslipDrawer.lines || []}
              pagination={false}
              locale={{ emptyText: <Empty description="No payslip lines" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              columns={[
                { title: 'Type', dataIndex: 'type', width: 150, render: (value) => <Tag>{value}</Tag> },
                { title: 'Name', dataIndex: 'name' },
                { title: 'Source', dataIndex: 'source', width: 190, render: (value) => value?.replaceAll('_', ' ') || '-' },
                { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: money },
                {
                  title: '',
                  width: 48,
                  render: (_, line) => (
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!editable || !['payslip_manual_addition', 'payslip_manual_deduction'].includes(line.source)}
                      onClick={() => deletePayslipLine(line)}
                    />
                  ),
                },
              ]}
            />

            <Card size="small" title="Manual Payslip Adjustment">
              <Form form={lineForm} layout="vertical" initialValues={{ type: 'earning', calculation_type: 'fixed' }}>
                <Row gutter={12}>
                  <Col xs={24} md={6}>
                    <Form.Item name="type" label="Type">
                      <Select options={[{ value: 'earning', label: 'Addition' }, { value: 'deduction', label: 'Deduction' }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required.' }]}><Input /></Form.Item>
                  </Col>
                  <Col xs={24} md={5}>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required.' }]}>
                      <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={5}>
                    <Form.Item name="calculation_type" label="Calculation">
                      <Select options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
                  </Col>
                </Row>
                <Button type="primary" icon={<PlusOutlined />} disabled={!editable} onClick={savePayslipLine}>
                  Add Line
                </Button>
              </Form>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="Void payroll"
        open={Boolean(voidingPayroll)}
        okText="Void Payroll"
        okButtonProps={{ danger: true }}
        onCancel={() => {
          setVoidingPayroll(null);
          setVoidReason('');
        }}
        onOk={async () => {
          if (!voidReason.trim()) {
            message.warning('Void reason is required.');
            return;
          }

          try {
            const payrollId = voidingPayroll.id;
            await axios.post(api(`/api/hrm/payroll/payrolls/${payrollId}/void`), { reason: voidReason });
            message.success('Payroll voided.');
            setVoidingPayroll(null);
            setVoidReason('');
            await loadDashboard();
            await refreshSelected(payrollId);
          } catch (error) {
            message.error(apiErrorMessage(error, 'Unable to void payroll.'));
          }
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="Void requires a reason"
          description="Void only if this payroll was created by mistake. Processed or paid payroll may be blocked by backend accounting rules."
          style={{ marginBottom: 12 }}
        />
        <Input.TextArea
          rows={4}
          value={voidReason}
          onChange={(event) => setVoidReason(event.target.value)}
          placeholder="Reason for voiding this payroll"
        />
      </Modal>
    </AuthenticatedLayout>
  );
}