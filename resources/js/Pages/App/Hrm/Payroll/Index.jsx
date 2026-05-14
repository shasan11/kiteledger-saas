import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
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
  FileDoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const statusColor = {
  draft: 'default',
  generated: 'processing',
  approved: 'green',
  processed: 'blue',
  paid: 'cyan',
  locked: 'purple',
  void: 'red',
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const employeeName = (employee) =>
  employee ? [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.username || employee.name : '-';

function MetricCard({ title, value, prefix, icon }) {
  const { token } = theme.useToken();
  return (
    <Card bordered={false} style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}>
      <Space align="start">
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: token.borderRadius,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: token.colorPrimary,
            background: token.colorPrimaryBg,
          }}
        >
          {icon}
        </span>
        <Statistic title={title} value={value} prefix={prefix} precision={typeof value === 'number' ? 2 : 0} />
      </Space>
    </Card>
  );
}

function PayrollWizard({ lookups, onGenerated, onQuickAddPeriod }) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);

  const loadPreview = async () => {
    const values = form.getFieldsValue();
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/users'), {
        params: { branch_id: values.branch_id, department_id: values.department_id, page_size: 100 },
      });
      setPreview(data?.results || []);
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      await axios.post(api('/api/hrm/payroll/payrolls/generate'), {
        ...values,
        idempotency_key: `payroll-${values.payroll_period_id}-${values.branch_id || 'all'}-${Date.now()}`,
      });
      message.success('Payroll generated.');
      setPreview([]);
      form.resetFields();
      onGenerated?.();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Payroll generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      bordered={false}
      title={<Space><CalculatorOutlined /> Payroll Setup</Space>}
      extra={<Text type="secondary">Draft generation allows missing employee payroll accounts</Text>}
      style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}
    >
      <Form form={form} layout="vertical" initialValues={{ employee_scope: 'all', exchange_rate: 1 }}>
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item label="Payroll Period" required>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="payroll_period_id" noStyle rules={[{ required: true, message: 'Select a payroll period' }]}>
                  <Select
                    showSearch
                    placeholder="Select period"
                    options={lookups.periods.map((p) => ({
                      value: p.id,
                      label: `${p.month}/${p.year}${p.branch?.name ? ` - ${p.branch.name}` : ''}`,
                    }))}
                  />
                </Form.Item>
                <Button icon={<PlusOutlined />} onClick={onQuickAddPeriod} />
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="branch_id" label="Branch">
              <Select allowClear showSearch placeholder="All branches" options={lookups.branches.map((b) => ({ value: b.id, label: b.name || b.code || b.id }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="currency_id" label="Currency">
              <Select allowClear showSearch placeholder="Currency" options={lookups.currencies.map((c) => ({ value: c.id, label: c.code || c.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="exchange_rate" label="Exchange Rate" rules={[{ required: true }]}>
              <InputNumber min={0.000001} precision={6} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="source_account_id" label="Payment From Account">
              <Select
                allowClear
                showSearch
                placeholder="Required before processing"
                options={lookups.paymentAccounts.map((a) => ({ value: a.id, label: `${a.code ? `${a.code} - ` : ''}${a.name}` }))}
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
        </Row>
        <Space>
          <Button onClick={loadPreview} loading={loading} icon={<ReloadOutlined />}>Preview Employees</Button>
          <Button type="primary" onClick={generate} loading={loading} icon={<CalculatorOutlined />}>Generate Payroll</Button>
        </Space>
      </Form>

      {preview.length > 0 && (
        <>
          <Divider />
          <Table
            size="small"
            rowKey="id"
            dataSource={preview}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'Employee', render: (_, r) => employeeName(r) || r.email },
              { title: 'Employee ID', dataIndex: 'employee_id' },
              { title: 'Branch', render: (_, r) => r.branch?.name || '-' },
              { title: 'Payroll Account', render: (_, r) => r.payroll_account?.name || <Tag color="warning">Missing</Tag> },
            ]}
          />
        </>
      )}
    </Card>
  );
}

function PayrollPeriodsPanel({ periods, branches, loading, onCreate, onEdit, onRefresh, style }) {
  const { token } = theme.useToken();

  return (
    <Card
      bordered={false}
      style={style}
      title={<Space><FileDoneOutlined /> Payroll Periods</Space>}
      extra={
        <Space>
          <Text type="secondary">{periods.length} periods</Text>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreate()}>Add Period</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={periods}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        columns={[
          {
            title: 'Period',
            render: (_, row) => (
              <Space direction="vertical" size={0}>
                <Text strong>{dayjs().month((row.month || 1) - 1).format('MMMM')} {row.year}</Text>
                <Text type="secondary">{row.start_date} to {row.end_date}</Text>
              </Space>
            ),
          },
          {
            title: 'Branch',
            render: (_, row) => row.branch?.name || branches.find((branch) => branch.id === row.branch_id)?.name || <Text type="secondary">All branches</Text>,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (value) => {
              const colors = { open: 'green', closed: 'default', locked: 'purple' };
              return <Tag color={colors[value]}>{value}</Tag>;
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
      extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={!editable}>Add</Button>}
    >
      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Calculation', dataIndex: 'calculation_type', width: 110 },
          { title: 'Applicability', dataIndex: 'applicability_type', width: 150, render: (v) => v?.replace('_', ' ') },
          { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: money },
          {
            title: '',
            width: 48,
            render: (_, r) => (
              <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={!editable} onClick={() => onDelete(r)} />
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
  const [lookups, setLookups] = useState({ periods: [], branches: [], currencies: [], accounts: [], paymentAccounts: [], components: [] });
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [payslipDrawer, setPayslipDrawer] = useState(null);
  const [voidingPayroll, setVoidingPayroll] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [periodModal, setPeriodModal] = useState({ open: false, record: null });
  const [periodSaving, setPeriodSaving] = useState(false);
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
    headerInner: {
      padding: 18,
    },
    headerMeta: {
      color: token.colorTextSecondary,
      marginTop: 4,
      maxWidth: 760,
    },
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

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/payroll/dashboard'));
      setDashboard(data);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    const [periods, branches, currencies, accounts, components] = await Promise.allSettled([
      axios.get(api('/api/hrm/payroll/periods'), { params: { page_size: 100, ordering: '-year,-month' } }),
      axios.get(api('/api/branches'), { params: { page_size: 100 } }),
      axios.get(api('/api/currencies'), { params: { page_size: 100 } }),
      axios.get(api('/api/accounts'), { params: { page_size: 300 } }),
      axios.get(api('/api/hrm/payroll/salary-components'), { params: { page_size: 100 } }),
    ]);
    const accountRows = accounts.status === 'fulfilled' ? accounts.value.data?.results || [] : [];
    setLookups({
      periods: periods.status === 'fulfilled' ? periods.value.data?.results || [] : [],
      branches: branches.status === 'fulfilled' ? branches.value.data?.results || [] : [],
      currencies: currencies.status === 'fulfilled' ? currencies.value.data?.results || [] : [],
      accounts: accountRows,
      paymentAccounts: accountRows.filter((a) => ['cash', 'bank'].includes(a.nature)),
      components: components.status === 'fulfilled' ? components.value.data?.results || [] : [],
    });
  };

  const openPeriodModal = (record = null) => {
    setPeriodModal({ open: true, record });
    periodForm.setFieldsValue(record ? {
      month: record.month,
      year: record.year,
      start_date: record.start_date ? dayjs(record.start_date) : null,
      end_date: record.end_date ? dayjs(record.end_date) : null,
      branch_id: record.branch_id || null,
      status: record.status || 'open',
    } : {
      month: dayjs().month() + 1,
      year: dayjs().year(),
      start_date: dayjs().startOf('month'),
      end_date: dayjs().endOf('month'),
      branch_id: null,
      status: 'open',
    });
  };

  const closePeriodModal = () => {
    setPeriodModal({ open: false, record: null });
    periodForm.resetFields();
  };

  const savePeriod = async () => {
    const values = await periodForm.validateFields();
    const payload = {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
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
      message.error(error?.response?.data?.message || 'Unable to save payroll period.');
    } finally {
      setPeriodSaving(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadLookups();
  }, []);

  const refreshSelected = async (id = selectedPayroll?.id) => {
    if (!id) return;
    const { data } = await axios.get(api(`/api/hrm/payroll/payrolls/${id}`));
    setSelectedPayroll(data);
    setDashboard((prev) => {
      if (!prev) return prev;
      const rows = (prev.recent_payrolls || prev.recent_runs || []).map((p) => (p.id === data.id ? data : p));
      return { ...prev, recent_payrolls: rows, recent_runs: rows };
    });
  };

  const openPayroll = async (payroll) => {
    setDrawerOpen(true);
    setSelectedPayroll(payroll);
    await refreshSelected(payroll.id);
  };

  const act = (payroll, action, label) => {
    modal.confirm({
      title: `${label} payroll?`,
      content: `${payroll.payroll_number || payroll.run_number} will move to ${label.toLowerCase()}.`,
      okText: label,
      onOk: async () => {
        await axios.post(api(`/api/hrm/payroll/payrolls/${payroll.id}/${action}`));
        message.success(`Payroll ${label.toLowerCase()} complete.`);
        await loadDashboard();
        await refreshSelected(payroll.id);
      },
    });
  };

  const saveAdjustment = async () => {
    const values = await form.validateFields();
    await axios.post(api(`/api/hrm/payroll/payrolls/${selectedPayroll.id}/${adjustmentModal}`), values);
    message.success(`${adjustmentModal === 'addition' ? 'Addition' : 'Deduction'} applied.`);
    setAdjustmentModal(null);
    form.resetFields();
    await refreshSelected();
  };

  const deleteAdjustment = async (kind, row) => {
    await axios.delete(api(`/api/hrm/payroll/payrolls/${selectedPayroll.id}/${kind}/${row.id}`));
    message.success('Adjustment deleted.');
    await refreshSelected();
  };

  const savePayslipLine = async () => {
    const values = await lineForm.validateFields();
    const source = values.type === 'earning' ? 'payslip_manual_addition' : 'payslip_manual_deduction';
    const { data } = await axios.post(api('/api/hrm/payroll/payslip-lines'), { ...values, source, payslip_id: payslipDrawer.id });
    message.success('Payslip line added.');
    setPayslipDrawer(data);
    lineForm.resetFields();
    await refreshSelected();
  };

  const deletePayslipLine = async (line) => {
    const { data } = await axios.delete(api(`/api/hrm/payroll/payslip-lines/${line.id}`));
    message.success('Payslip line deleted.');
    setPayslipDrawer(data);
    await refreshSelected();
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
    () => (selectedPayroll?.payslips || []).map((p) => ({ value: p.employee_id, label: employeeName(p.employee) })),
    [selectedPayroll],
  );

  const payrollColumns = [
    { title: 'Payroll #', dataIndex: 'payroll_number', width: 160, render: (v, r) => v || r.run_number },
    { title: 'Period', render: (_, r) => `${r.payroll_period?.month || '-'}/${r.payroll_period?.year || '-'}` },
    { title: 'Employees', dataIndex: 'total_employees', align: 'right', width: 100 },
    { title: 'Earnings', dataIndex: 'total_earnings', align: 'right', render: money },
    { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
    { title: 'Net Payable', dataIndex: 'total_net_payable', align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
    { title: 'Payment From Account', render: (_, r) => r.source_account?.name || <Text type="secondary">Not selected</Text> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: '', width: 80, render: (_, r) => <Button size="small" type="link" onClick={() => openPayroll(r)}>Open</Button> },
  ];

  const payslipColumns = [
    { title: 'Employee', width: 180, render: (_, p) => <Text strong>{employeeName(p.employee)}</Text> },
    { title: 'Basic Salary', dataIndex: 'salary', align: 'right', width: 120, render: money },
    { title: 'Earnings', dataIndex: 'gross_earnings', align: 'right', render: money },
    { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
    { title: 'Net Payable', dataIndex: 'net_payable', align: 'right', render: (v) => <Text strong>{money(v)}</Text> },
    { title: 'Employee Payroll Account', render: (_, p) => p.employee?.payroll_account?.name || <Tag color="warning">Missing</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: '', width: 90, render: (_, p) => <Button size="small" onClick={() => setPayslipDrawer(p)}>Payslip</Button> },
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
                    Generate payroll, apply shared adjustments, review payslips, post the journal voucher, and settle salaries from the selected payment account.
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
                  <Button icon={<PlusOutlined />} onClick={() => openPeriodModal()}>Add Period</Button>
                  <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>Refresh</Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} xl={6}><MetricCard title="Employees Included" value={dashboard?.employees_included || 0} icon={<TeamOutlined />} /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard title="Gross Payroll" value={dashboard?.gross_payroll || 0} prefix="$" icon={<DollarOutlined />} /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard title="Deductions" value={dashboard?.total_deductions || 0} prefix="$" icon={<AuditOutlined />} /></Col>
            <Col xs={24} sm={12} xl={6}><MetricCard title="Net Payable" value={dashboard?.net_payable || 0} prefix="$" icon={<BankOutlined />} /></Col>
          </Row>

          <Tabs
            items={[
              { key: 'generate', label: 'Create Payroll', icon: <PlusOutlined />, children: <PayrollWizard lookups={lookups} onGenerated={loadDashboard} onQuickAddPeriod={() => openPeriodModal()} /> },
              {
                key: 'payrolls',
                label: 'Payrolls',
                icon: <CheckCircleOutlined />,
                children: (
                  <Card
                    bordered={false}
                    style={pageStyles.sectionCard}
                    title={<Space><CheckCircleOutlined /> Payroll Register</Space>}
                    extra={<Text type="secondary">{payrollRows.length} recent records</Text>}
                  >
                    <Table
                      size="middle"
                      rowKey="id"
                      columns={payrollColumns}
                      dataSource={payrollRows}
                      pagination={{ pageSize: 10, showSizeChanger: false }}
                      scroll={{ x: 1040 }}
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
                    loading={loading}
                    onCreate={() => openPeriodModal()}
                    onEdit={openPeriodModal}
                    onRefresh={loadLookups}
                    style={pageStyles.sectionCard}
                  />
                ),
              },
              {
                key: 'components',
                label: 'Components',
                icon: <SettingOutlined />,
                children: (
                  <ReusableCrud
                    title="Salary Components"
                    icon={<SettingOutlined />}
                    apiUrl={api('/api/hrm/payroll/salary-components/')}
                    fields={[
                      { name: 'name', label: 'Name', type: 'text', required: true, col: 8 },
                      { name: 'code', label: 'Code', type: 'text', required: true, col: 4 },
                      { name: 'type', label: 'Type', type: 'select', required: true, col: 6, options: ['earning', 'deduction', 'employer_contribution'].map((v) => ({ value: v, label: v })) },
                      { name: 'calculation_type', label: 'Calculation', type: 'select', required: true, col: 6, options: ['fixed', 'percentage', 'formula', 'manual'].map((v) => ({ value: v, label: v })) },
                      { name: 'taxable', label: 'Taxable', type: 'switch', col: 6 },
                      { name: 'affects_net_salary', label: 'Affects Net', type: 'switch', col: 6 },
                      { name: 'sort_order', label: 'Sort Order', type: 'number', col: 6 },
                      { name: 'active', label: 'Active', type: 'switch', col: 6 },
                    ]}
                    columns={[
                      { title: 'Name', dataIndex: 'name' },
                      { title: 'Code', dataIndex: 'code' },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
                      { title: 'Calculation', dataIndex: 'calculation_type' },
                      { title: 'Active', dataIndex: 'active', render: (v) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
                    ]}
                    form_ui="drawer"
                    enableServerPagination
                  />
                ),
              },
            ]}
          />
        </Space>
      </div>

      <Drawer
        title={selectedPayroll ? (
          <Space>
            <Text strong>{selectedPayroll.payroll_number || selectedPayroll.run_number}</Text>
            <Tag color={statusColor[selectedPayroll.status]}>{selectedPayroll.status}</Tag>
          </Space>
        ) : 'Payroll'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={1180}
        extra={selectedPayroll && (
          <Space>
            {selectedPayroll.status === 'generated' && <Button type="primary" onClick={() => act(selectedPayroll, 'approve', 'Approve')}>Approve</Button>}
            {selectedPayroll.status === 'approved' && <Button type="primary" onClick={() => act(selectedPayroll, 'process', 'Process')}>Process</Button>}
            {selectedPayroll.status === 'processed' && <Button onClick={() => act(selectedPayroll, 'mark-paid', 'Mark Paid')}>Mark Paid</Button>}
            {selectedPayroll.status === 'paid' && <Button onClick={() => act(selectedPayroll, 'lock', 'Lock')}>Lock</Button>}
            {['generated', 'approved', 'processed'].includes(selectedPayroll.status) && <Button danger onClick={() => setVoidingPayroll(selectedPayroll)}>Void</Button>}
          </Space>
        )}
      >
        {selectedPayroll && (
          <Space direction="vertical" size={12} style={{ display: 'flex' }}>
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 4 }}>
              <Descriptions.Item label="Payroll Period">{selectedPayroll.payroll_period?.month}/{selectedPayroll.payroll_period?.year}</Descriptions.Item>
              <Descriptions.Item label="Branch">{selectedPayroll.branch?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Currency">{selectedPayroll.currency?.code || selectedPayroll.currency?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Exchange Rate">{selectedPayroll.exchange_rate}</Descriptions.Item>
              <Descriptions.Item label="Payment From Account">{selectedPayroll.source_account?.name || <Tag color="warning">Required before processing</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Journal Voucher">{selectedPayroll.journal_voucher?.voucher_no || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={statusColor[selectedPayroll.status]}>{selectedPayroll.status}</Tag></Descriptions.Item>
            </Descriptions>

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}><Statistic title="Employees" value={selectedPayroll.total_employees || 0} /></Col>
              <Col xs={12} sm={6}><Statistic title="Earnings" value={money(selectedPayroll.total_earnings)} /></Col>
              <Col xs={12} sm={6}><Statistic title="Deductions" value={money(selectedPayroll.total_deductions)} /></Col>
              <Col xs={12} sm={6}><Statistic title="Net Payable" value={money(selectedPayroll.total_net_payable)} valueStyle={{ color: token.colorPrimary }} /></Col>
            </Row>

            <Table rowKey="id" size="small" dataSource={selectedPayroll.payslips || []} columns={payslipColumns} pagination={{ pageSize: 20 }} scroll={{ x: 980 }} />

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={12}>
                <AdjustmentTable title="Payroll Additions" rows={selectedPayroll.additions || []} editable={editable} onAdd={() => setAdjustmentModal('addition')} onDelete={(row) => deleteAdjustment('addition', row)} />
              </Col>
              <Col xs={24} lg={12}>
                <AdjustmentTable title="Payroll Deductions" rows={selectedPayroll.deductions || []} editable={editable} onAdd={() => setAdjustmentModal('deduction')} onDelete={(row) => deleteAdjustment('deduction', row)} />
              </Col>
            </Row>
          </Space>
        )}
      </Drawer>

      <Modal
        title={adjustmentModal === 'addition' ? 'Add Payroll Addition' : 'Add Payroll Deduction'}
        open={Boolean(adjustmentModal)}
        onCancel={() => { setAdjustmentModal(null); form.resetFields(); }}
        onOk={saveAdjustment}
        okText="Apply"
      >
        <Form form={form} layout="vertical" initialValues={{ calculation_type: 'fixed', applicability_type: 'all_employees' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="component_id" label="Component">
            <Select allowClear showSearch options={lookups.components.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="calculation_type" label="Calculation" rules={[{ required: true }]}><Select options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]} /></Form.Item></Col>
          </Row>
          <Form.Item name="applicability_type" label="Applicability" rules={[{ required: true }]}>
            <Select options={[{ value: 'all_employees', label: 'All employees' }, { value: 'selected_employees', label: 'Selected employees' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.applicability_type !== next.applicability_type}>
            {({ getFieldValue }) => getFieldValue('applicability_type') === 'selected_employees' && (
              <Form.Item name="selected_employee_ids" label="Employees" rules={[{ required: true }]}>
                <Select mode="multiple" options={selectedEmployeeOptions} />
              </Form.Item>
            )}
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
        <Form form={periodForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                <Select
                  options={Array.from({ length: 12 }, (_, index) => ({
                    value: index + 1,
                    label: dayjs().month(index).format('MMMM'),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="branch_id" label="Branch">
                <Select
                  allowClear
                  showSearch
                  placeholder="All branches"
                  options={lookups.branches.map((branch) => ({ value: branch.id, label: branch.name || branch.code || branch.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'locked', label: 'Locked' },
                  ]}
                />
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
        {payslipDrawer && (
          <Space direction="vertical" size={12} style={{ display: 'flex' }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Employee">{employeeName(payslipDrawer.employee)}</Descriptions.Item>
              <Descriptions.Item label="Payroll Account">{payslipDrawer.employee?.payroll_account?.name || <Tag color="warning">Missing</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Payable Days">{payslipDrawer.payable_days}</Descriptions.Item>
              <Descriptions.Item label="Overtime Hours">{payslipDrawer.overtime_hours}</Descriptions.Item>
              <Descriptions.Item label="Earnings">{money(payslipDrawer.gross_earnings)}</Descriptions.Item>
              <Descriptions.Item label="Deductions">{money(payslipDrawer.total_deductions)}</Descriptions.Item>
              <Descriptions.Item label="Net Payable"><Text strong>{money(payslipDrawer.net_payable)}</Text></Descriptions.Item>
            </Descriptions>

            <Table
              size="small"
              rowKey="id"
              dataSource={payslipDrawer.lines || []}
              pagination={false}
              columns={[
                { title: 'Type', dataIndex: 'type', width: 130, render: (v) => <Tag>{v}</Tag> },
                { title: 'Name', dataIndex: 'name' },
                { title: 'Source', dataIndex: 'source', width: 170, render: (v) => v?.replaceAll('_', ' ') },
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

            <Card size="small" title="Payslip Adjustment">
              <Form form={lineForm} layout="vertical" initialValues={{ type: 'earning', calculation_type: 'fixed' }}>
                <Row gutter={12}>
                  <Col xs={24} md={6}><Form.Item name="type" label="Type"><Select options={[{ value: 'earning', label: 'Addition' }, { value: 'deduction', label: 'Deduction' }]} /></Form.Item></Col>
                  <Col xs={24} md={8}><Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={5}><Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={24} md={5}><Form.Item name="calculation_type" label="Calculation"><Select options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]} /></Form.Item></Col>
                  <Col xs={24}><Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item></Col>
                </Row>
                <Button type="primary" icon={<PlusOutlined />} disabled={!editable} onClick={savePayslipLine}>Add Line</Button>
              </Form>
            </Card>
          </Space>
        )}
      </Drawer>

      <Modal
        title="Void payroll"
        open={Boolean(voidingPayroll)}
        okText="Void Payroll"
        okButtonProps={{ danger: true }}
        onCancel={() => { setVoidingPayroll(null); setVoidReason(''); }}
        onOk={async () => {
          if (!voidReason.trim()) { message.warning('Void reason is required.'); return; }
          await axios.post(api(`/api/hrm/payroll/payrolls/${voidingPayroll.id}/void`), { reason: voidReason });
          message.success('Payroll voided.');
          setVoidingPayroll(null);
          setVoidReason('');
          await loadDashboard();
          await refreshSelected(voidingPayroll.id);
        }}
      >
        <Input.TextArea rows={4} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason for voiding this payroll" />
      </Modal>
    </AuthenticatedLayout>
  );
}
