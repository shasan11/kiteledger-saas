import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
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
  DollarOutlined,
  FileDoneOutlined,
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
  reviewed: 'blue',
  approved: 'green',
  paid: 'cyan',
  locked: 'purple',
  void: 'red',
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function MetricCard({ title, value, prefix, icon }) {
  const { token } = theme.useToken();

  return (
    <Card bordered={false} style={{ borderRadius: 18, boxShadow: token.boxShadowTertiary }}>
      <Space align="start">
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
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

function PayrollWizard({ onGenerated }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const loadOptions = async () => {
      const [periodResult, branchResult] = await Promise.allSettled([
        axios.get(api('/api/hrm/payroll/periods'), { params: { page_size: 50, ordering: '-year,-month' } }),
        axios.get(api('/api/branches'), { params: { page_size: 100 } }),
      ]);

      if (periodResult.status === 'fulfilled') {
        setPeriods(periodResult.value.data?.results || []);
      }

      if (branchResult.status === 'fulfilled') {
        setBranches(branchResult.value.data?.results || []);
      }
    };

    loadOptions();
  }, []);

  const loadPreview = async () => {
    const values = form.getFieldsValue();
    if (!values.branch_id && values.employee_scope === 'branch') {
      message.warning('Select a branch before previewing branch payroll.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/users'), {
        params: {
          branch_id: values.branch_id,
          department_id: values.department_id,
          page_size: 100,
        },
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
      await axios.post(api('/api/hrm/payroll/runs/generate'), {
        ...values,
        idempotency_key: `payroll-${values.payroll_period_id}-${values.branch_id || 'all'}-${Date.now()}`,
      });
      message.success('Payroll generated safely.');
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
    <Card bordered={false} style={{ borderRadius: 18 }}>
      <Steps
        size="small"
        current={preview.length ? 4 : 0}
        items={[
          { title: 'Period' },
          { title: 'Employees' },
          { title: 'Attendance' },
          { title: 'Adjustments' },
          { title: 'Generate' },
        ]}
        style={{ marginBottom: 18 }}
      />

      <Form form={form} layout="vertical" initialValues={{ employee_scope: 'branch' }}>
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="payroll_period_id" label="Payroll Period" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select period"
                options={periods.map((period) => ({
                  value: period.id,
                  label: `${period.month}/${period.year} ${period.branch?.name ? `- ${period.branch.name}` : ''}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="branch_id" label="Branch">
              <Select
                allowClear
                showSearch
                placeholder="All branches or select one"
                options={branches.map((branch) => ({ value: branch.id, label: branch.name || branch.code || branch.id }))}
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
          <Button onClick={loadPreview} loading={loading} icon={<ReloadOutlined />}>
            Preview Employees
          </Button>
          <Button type="primary" onClick={generate} loading={loading} icon={<CalculatorOutlined />}>
            Confirm Generation
          </Button>
        </Space>
      </Form>

      <Divider />
      <Table
        size="small"
        rowKey="id"
        dataSource={preview}
        pagination={{ pageSize: 6 }}
        locale={{ emptyText: 'Preview selected employees before generating payroll.' }}
        columns={[
          { title: 'Employee', render: (_, row) => row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email },
          { title: 'Employee ID', dataIndex: 'employee_id' },
          { title: 'Branch', render: (_, row) => row.branch?.name || row.branch_id || '-' },
          { title: 'Department', render: (_, row) => row.department?.name || '-' },
        ]}
      />
    </Card>
  );
}

export default function Payroll({ auth }) {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voidingRun, setVoidingRun] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/payroll/dashboard'));
      setDashboard(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const act = async (run, action, label) => {
    modal.confirm({
      title: `${label} payroll run?`,
      content: `Run ${run.run_number} will move from ${run.status}.`,
      okText: label,
      onOk: async () => {
        await axios.post(api(`/api/hrm/payroll/runs/${run.id}/${action}`));
        message.success(`Payroll ${label.toLowerCase()} complete.`);
        loadDashboard();
      },
    });
  };

  const runColumns = useMemo(
    () => [
      { title: 'Run #', dataIndex: 'run_number', width: 150 },
      { title: 'Period', render: (_, row) => `${row.payroll_period?.month || '-'} / ${row.payroll_period?.year || '-'}` },
      { title: 'Employees', dataIndex: 'total_employees', align: 'right' },
      { title: 'Gross', dataIndex: 'total_gross', align: 'right', render: money },
      { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
      { title: 'Net Payable', dataIndex: 'total_net_payable', align: 'right', render: (value) => <Text strong>{money(value)}</Text> },
      { title: 'Status', dataIndex: 'status', render: (value) => <Tag color={statusColor[value]}>{value}</Tag> },
      {
        title: 'Actions',
        width: 290,
        render: (_, row) => (
          <Space wrap size={4}>
            {row.status === 'generated' && <Button size="small" onClick={() => act(row, 'review', 'Review')}>Review</Button>}
            {row.status === 'reviewed' && <Button size="small" type="primary" onClick={() => act(row, 'approve', 'Approve')}>Approve</Button>}
            {row.status === 'approved' && <Button size="small" onClick={() => act(row, 'journal-voucher', 'Generate JV')}>JV</Button>}
            {row.status === 'approved' && <Button size="small" onClick={() => act(row, 'mark-paid', 'Mark Paid')}>Pay</Button>}
            {row.status === 'paid' && <Button size="small" onClick={() => act(row, 'lock', 'Lock')}>Lock</Button>}
            {['generated', 'reviewed', 'approved'].includes(row.status) && (
              <Button size="small" danger onClick={() => setVoidingRun(row)}>Void</Button>
            )}
          </Space>
        ),
      },
    ],
    [],
  );

  const componentFields = [
    { name: 'name', label: 'Name', type: 'text', required: true, col: 8 },
    { name: 'code', label: 'Code', type: 'text', required: true, col: 4 },
    { name: 'type', label: 'Type', type: 'select', required: true, col: 6, options: ['earning', 'deduction', 'employer_contribution'].map((value) => ({ value, label: value })) },
    { name: 'calculation_type', label: 'Calculation', type: 'select', required: true, col: 6, options: ['fixed', 'percentage', 'formula', 'manual'].map((value) => ({ value, label: value })) },
    { name: 'taxable', label: 'Taxable', type: 'switch', col: 6 },
    { name: 'affects_net_salary', label: 'Affects Net', type: 'switch', col: 6 },
    { name: 'sort_order', label: 'Sort Order', type: 'number', col: 6 },
    { name: 'active', label: 'Active', type: 'switch', col: 6 },
  ];

  const periodFields = [
    { name: 'month', label: 'Month', type: 'number', required: true, col: 6 },
    { name: 'year', label: 'Year', type: 'number', required: true, col: 6 },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true, col: 6 },
    { name: 'end_date', label: 'End Date', type: 'date', required: true, col: 6 },
    { name: 'branch_id', label: 'Branch ID', type: 'text', col: 8 },
    { name: 'status', label: 'Status', type: 'select', col: 8, options: ['open', 'closed', 'locked'].map((value) => ({ value, label: value })) },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Payroll" />
      <div style={{ padding: 16, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Card bordered={false} style={{ borderRadius: 24, background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorBgContainer})` }}>
            <Row align="middle" gutter={[16, 16]}>
              <Col flex="auto">
                <Title level={3} style={{ margin: 0 }}>Payroll Command Center</Title>
                <Text type="secondary">Monthly payroll runs, salary structures, attendance impact, approvals, payments, and accounting handoff.</Text>
              </Col>
              <Col>
                <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>Refresh</Button>
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
              {
                key: 'runs',
                label: 'Payroll Runs',
                children: (
                  <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                    <PayrollWizard onGenerated={loadDashboard} />
                    <Card title="Recent Payroll Runs" bordered={false} style={{ borderRadius: 18 }}>
                      <Table size="small" rowKey="id" columns={runColumns} dataSource={dashboard?.recent_runs || []} pagination={false} />
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'periods',
                label: 'Periods',
                children: (
                  <ReusableCrud
                    title="Payroll Periods"
                    icon={<FileDoneOutlined />}
                    apiUrl={api('/api/hrm/payroll/periods/')}
                    fields={periodFields}
                    columns={[
                      { title: 'Month', dataIndex: 'month' },
                      { title: 'Year', dataIndex: 'year' },
                      { title: 'Start', dataIndex: 'start_date' },
                      { title: 'End', dataIndex: 'end_date' },
                      { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
                    ]}
                    form_ui="drawer"
                    enableServerPagination
                  />
                ),
              },
              {
                key: 'components',
                label: 'Components',
                children: (
                  <ReusableCrud
                    title="Salary Components"
                    icon={<SettingOutlined />}
                    apiUrl={api('/api/hrm/payroll/salary-components/')}
                    fields={componentFields}
                    columns={[
                      { title: 'Name', dataIndex: 'name' },
                      { title: 'Code', dataIndex: 'code' },
                      { title: 'Type', dataIndex: 'type', render: (value) => <Tag>{value}</Tag> },
                      { title: 'Calculation', dataIndex: 'calculation_type' },
                      { title: 'Taxable', dataIndex: 'taxable', render: (value) => (value ? 'Yes' : 'No') },
                      { title: 'Active', dataIndex: 'active', render: (value) => (value ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
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

      <Modal
        title="Void payroll run"
        open={Boolean(voidingRun)}
        okText="Void Run"
        okButtonProps={{ danger: true }}
        onCancel={() => setVoidingRun(null)}
        onOk={async () => {
          if (!voidReason.trim()) {
            message.warning('Void reason is required.');
            return;
          }
          await axios.post(api(`/api/hrm/payroll/runs/${voidingRun.id}/void`), { reason: voidReason });
          message.success('Payroll run voided.');
          setVoidingRun(null);
          setVoidReason('');
          loadDashboard();
        }}
      >
        <Input.TextArea rows={4} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason for voiding this payroll run" />
      </Modal>
    </AuthenticatedLayout>
  );
}
