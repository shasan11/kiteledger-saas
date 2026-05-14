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
  Drawer,
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
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
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
    <Card bordered={false} style={{ borderRadius: 14, boxShadow: token.boxShadowTertiary }}>
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
        <Statistic
          title={title}
          value={value}
          prefix={prefix}
          precision={typeof value === 'number' ? 2 : 0}
        />
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
    const load = async () => {
      const [periodResult, branchResult] = await Promise.allSettled([
        axios.get(api('/api/hrm/payroll/periods'), { params: { page_size: 50, ordering: '-year,-month' } }),
        axios.get(api('/api/branches'), { params: { page_size: 100 } }),
      ]);
      if (periodResult.status === 'fulfilled') setPeriods(periodResult.value.data?.results || []);
      if (branchResult.status === 'fulfilled') setBranches(branchResult.value.data?.results || []);
    };
    load();
  }, []);

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
      await axios.post(api('/api/hrm/payroll/runs/generate'), {
        ...values,
        idempotency_key: `payroll-${values.payroll_period_id}-${values.branch_id || 'all'}-${Date.now()}`,
      });
      message.success('Payroll run generated for all employees.');
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
    <Card bordered={false} style={{ borderRadius: 14 }}>
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

      <Form form={form} layout="vertical" initialValues={{ employee_scope: 'all' }}>
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="payroll_period_id" label="Payroll Period" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select period"
                options={periods.map((p) => ({
                  value: p.id,
                  label: `${p.month}/${p.year}${p.branch?.name ? ` — ${p.branch.name}` : ''}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="branch_id" label="Branch">
              <Select
                allowClear
                showSearch
                placeholder="All branches"
                options={branches.map((b) => ({ value: b.id, label: b.name || b.code || b.id }))}
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
            Generate Payroll
          </Button>
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
              {
                title: 'Employee',
                render: (_, r) =>
                  r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
              },
              { title: 'Employee ID', dataIndex: 'employee_id' },
              { title: 'Branch', render: (_, r) => r.branch?.name || r.branch_id || '—' },
              { title: 'Department', render: (_, r) => r.department?.name || '—' },
            ]}
          />
        </>
      )}
    </Card>
  );
}

export default function Payroll({ auth }) {
  const { message, modal } = App.useApp();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  // Run detail drawer
  const [selectedRun, setSelectedRun] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [payslipEdits, setPayslipEdits] = useState({});
  const [savingPayslips, setSavingPayslips] = useState(false);

  // Bulk modals
  const [bulkMode, setBulkMode] = useState(null); // 'bonus' | 'deduction'
  const [bulkAmount, setBulkAmount] = useState(0);
  const [bulkComment, setBulkComment] = useState('');

  // Void modal
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

  useEffect(() => { loadDashboard(); }, []);

  const act = (run, action, label) => {
    modal.confirm({
      title: `${label} payroll run?`,
      content: `Run ${run.run_number} will be moved to ${label.toLowerCase()} state.`,
      okText: label,
      onOk: async () => {
        await axios.post(api(`/api/hrm/payroll/runs/${run.id}/${action}`));
        message.success(`Payroll run ${label.toLowerCase()} complete.`);
        loadDashboard();
        if (drawerOpen && selectedRun?.id === run.id) setDrawerOpen(false);
      },
    });
  };

  const openRun = async (run) => {
    setSelectedRun(run);
    setDrawerOpen(true);
    setPayslipEdits({});
    setPayslipsLoading(true);
    try {
      const { data } = await axios.get(api('/api/hrm/payslips/'), {
        params: { payroll_run_id: run.id, page_size: 500 },
      });
      const rows = data?.results || data?.data || [];
      setPayslips(rows);
      const init = {};
      rows.forEach((p) => {
        init[p.id] = {
          bonus: p.bonus ?? 0,
          deduction: p.deduction ?? 0,
          bonus_comment: p.bonus_comment || '',
          deduction_comment: p.deduction_comment || '',
          dirty: false,
        };
      });
      setPayslipEdits(init);
    } finally {
      setPayslipsLoading(false);
    }
  };

  const updatePayslipEdit = (id, field, value) => {
    setPayslipEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value, dirty: true },
    }));
  };

  const savePayslipEdits = async () => {
    const dirty = Object.entries(payslipEdits).filter(([, e]) => e.dirty);
    if (!dirty.length) { message.info('No changes to save.'); return; }
    setSavingPayslips(true);
    try {
      await Promise.all(
        dirty.map(([id, edit]) =>
          axios.patch(api(`/api/hrm/payslips/${id}/`), {
            bonus: Number(edit.bonus || 0),
            deduction: Number(edit.deduction || 0),
            bonus_comment: edit.bonus_comment?.trim() || null,
            deduction_comment: edit.deduction_comment?.trim() || null,
          }),
        ),
      );
      message.success(`${dirty.length} payslip${dirty.length !== 1 ? 's' : ''} updated.`);
      await openRun(selectedRun);
    } catch {
      message.error('Some payslips could not be saved.');
    } finally {
      setSavingPayslips(false);
    }
  };

  const applyBulk = () => {
    if (!bulkAmount) { message.warning('Enter a valid amount.'); return; }
    const field = bulkMode === 'bonus' ? 'bonus' : 'deduction';
    const commentField = bulkMode === 'bonus' ? 'bonus_comment' : 'deduction_comment';
    setPayslipEdits((prev) => {
      const next = { ...prev };
      payslips.forEach((p) => {
        next[p.id] = {
          ...(next[p.id] || {}),
          [field]: Number(bulkAmount),
          [commentField]: bulkComment,
          dirty: true,
        };
      });
      return next;
    });
    setBulkMode(null);
    setBulkAmount(0);
    setBulkComment('');
    message.success(`Bulk ${bulkMode} applied to ${payslips.length} payslips. Save to confirm.`);
  };

  const dirtyPayslipCount = useMemo(
    () => Object.values(payslipEdits).filter((e) => e.dirty).length,
    [payslipEdits],
  );

  const runColumns = [
    { title: 'Run #', dataIndex: 'run_number', width: 150 },
    {
      title: 'Period',
      render: (_, r) => `${r.payroll_period?.month || '—'} / ${r.payroll_period?.year || '—'}`,
    },
    { title: 'Employees', dataIndex: 'total_employees', align: 'right', width: 100 },
    { title: 'Gross', dataIndex: 'total_gross', align: 'right', render: money },
    { title: 'Deductions', dataIndex: 'total_deductions', align: 'right', render: money },
    {
      title: 'Net Payable',
      dataIndex: 'total_net_payable',
      align: 'right',
      render: (v) => <Text strong>{money(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v) => <Tag color={statusColor[v]}>{v}</Tag>,
    },
    {
      title: '',
      width: 80,
      render: (_, r) => (
        <Button
          size="small"
          type="link"
          onClick={(e) => { e.stopPropagation(); openRun(r); }}
        >
          Open
        </Button>
      ),
    },
  ];

  const payslipColumns = [
    {
      title: 'Employee',
      key: 'emp',
      width: 180,
      render: (_, p) => {
        const emp = p.employee || p.user;
        const name = emp
          ? [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.username
          : '—';
        return <Text strong>{name}</Text>;
      },
    },
    { title: 'Salary', dataIndex: 'salary', align: 'right', width: 110, render: money },
    {
      title: 'Salary Payable',
      dataIndex: 'salary_payable',
      align: 'right',
      width: 120,
      render: money,
    },
    {
      title: 'Bonus',
      key: 'bonus',
      width: 120,
      render: (_, p) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          value={payslipEdits[p.id]?.bonus ?? p.bonus ?? 0}
          onChange={(val) => updatePayslipEdit(p.id, 'bonus', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Deduction',
      key: 'deduction',
      width: 120,
      render: (_, p) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          value={payslipEdits[p.id]?.deduction ?? p.deduction ?? 0}
          onChange={(val) => updatePayslipEdit(p.id, 'deduction', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total Payable',
      key: 'total',
      align: 'right',
      width: 130,
      render: (_, p) => {
        const edit = payslipEdits[p.id];
        const total =
          Number(p.salary_payable || 0) +
          Number(edit?.bonus ?? p.bonus ?? 0) -
          Number(edit?.deduction ?? p.deduction ?? 0);
        return (
          <Text strong style={{ color: '#1677ff' }}>
            {money(total)}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'payment_status',
      width: 100,
      render: (v) => (
        <Tag color={v === 'PAID' ? 'green' : v === 'PARTIAL' ? 'blue' : 'orange'}>{v}</Tag>
      ),
    },
  ];

  const drawerTitle = selectedRun ? (
    <Row align="middle" gutter={8} wrap={false}>
      <Col flex="auto">
        <Space>
          <Text strong>Run {selectedRun.run_number}</Text>
          <Tag color={statusColor[selectedRun.status]}>{selectedRun.status}</Tag>
        </Space>
      </Col>
      <Col>
        <Space size={4}>
          {selectedRun.status === 'generated' && (
            <Button size="small" onClick={() => act(selectedRun, 'review', 'Review')}>
              Review
            </Button>
          )}
          {selectedRun.status === 'reviewed' && (
            <Button size="small" type="primary" onClick={() => act(selectedRun, 'approve', 'Approve')}>
              Approve
            </Button>
          )}
          {selectedRun.status === 'approved' && (
            <Button size="small" onClick={() => act(selectedRun, 'mark-paid', 'Mark Paid')}>
              Mark Paid
            </Button>
          )}
          {selectedRun.status === 'paid' && (
            <Button size="small" onClick={() => act(selectedRun, 'lock', 'Lock')}>
              Lock
            </Button>
          )}
          {['generated', 'reviewed', 'approved'].includes(selectedRun.status) && (
            <Button size="small" danger onClick={() => { setVoidingRun(selectedRun); setDrawerOpen(false); }}>
              Void
            </Button>
          )}
        </Space>
      </Col>
    </Row>
  ) : (
    'Run Detail'
  );

  const componentFields = [
    { name: 'name', label: 'Name', type: 'text', required: true, col: 8 },
    { name: 'code', label: 'Code', type: 'text', required: true, col: 4 },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      col: 6,
      options: ['earning', 'deduction', 'employer_contribution'].map((v) => ({ value: v, label: v })),
    },
    {
      name: 'calculation_type',
      label: 'Calculation',
      type: 'select',
      required: true,
      col: 6,
      options: ['fixed', 'percentage', 'formula', 'manual'].map((v) => ({ value: v, label: v })),
    },
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
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      col: 8,
      options: ['open', 'closed', 'locked'].map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Payroll" />
      <div style={{ padding: 16, minHeight: 'calc(100vh - 64px)' }}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <Row align="middle">
            <Col flex="auto">
              <Title level={4} style={{ margin: 0 }}>Payroll</Title>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>
                Refresh
              </Button>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Employees Included" value={dashboard?.employees_included || 0} icon={<TeamOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Gross Payroll" value={dashboard?.gross_payroll || 0} prefix="$" icon={<DollarOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Deductions" value={dashboard?.total_deductions || 0} prefix="$" icon={<AuditOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <MetricCard title="Net Payable" value={dashboard?.net_payable || 0} prefix="$" icon={<BankOutlined />} />
            </Col>
          </Row>

          <Tabs
            items={[
              {
                key: 'generate',
                label: 'Generate Run',
                icon: <PlusOutlined />,
                children: <PayrollWizard onGenerated={loadDashboard} />,
              },
              {
                key: 'runs',
                label: 'Payroll Runs',
                icon: <CheckCircleOutlined />,
                children: (
                  <Card bordered={false} style={{ borderRadius: 14 }}>
                    <Table
                      size="small"
                      rowKey="id"
                      columns={runColumns}
                      dataSource={dashboard?.recent_runs || []}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: 'No payroll runs yet. Generate one above.' }}
                    />
                  </Card>
                ),
              },
              {
                key: 'periods',
                label: 'Periods',
                icon: <FileDoneOutlined />,
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
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag>{v}</Tag> },
                    ]}
                    form_ui="drawer"
                    enableServerPagination
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
                    fields={componentFields}
                    columns={[
                      { title: 'Name', dataIndex: 'name' },
                      { title: 'Code', dataIndex: 'code' },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
                      { title: 'Calculation', dataIndex: 'calculation_type' },
                      { title: 'Taxable', dataIndex: 'taxable', render: (v) => (v ? 'Yes' : 'No') },
                      {
                        title: 'Active',
                        dataIndex: 'active',
                        render: (v) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>),
                      },
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

      {/* Run detail drawer */}
      <Drawer
        title={drawerTitle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={960}
        extra={
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => { setBulkMode('bonus'); setBulkAmount(0); setBulkComment(''); }}
              disabled={!payslips.length}
            >
              Bulk Bonus
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => { setBulkMode('deduction'); setBulkAmount(0); setBulkComment(''); }}
              disabled={!payslips.length}
            >
              Bulk Deduction
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={savePayslipEdits}
              loading={savingPayslips}
              disabled={!dirtyPayslipCount}
            >
              Save{dirtyPayslipCount > 0 ? ` (${dirtyPayslipCount})` : ''}
            </Button>
          </Space>
        }
      >
        {selectedRun && (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Statistic title="Employees" value={selectedRun.total_employees || 0} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Gross" value={money(selectedRun.total_gross)} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Deductions" value={money(selectedRun.total_deductions)} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Net Payable" value={money(selectedRun.total_net_payable)} valueStyle={{ color: '#1677ff' }} />
            </Col>
          </Row>
        )}
        <Table
          rowKey="id"
          loading={payslipsLoading}
          dataSource={payslips}
          columns={payslipColumns}
          size="small"
          pagination={{ pageSize: 20, showTotal: (t) => `${t} payslips` }}
          scroll={{ x: 880 }}
          locale={{ emptyText: 'No payslips found for this run.' }}
        />
      </Drawer>

      {/* Bulk bonus / deduction modal */}
      <Modal
        title={bulkMode === 'bonus' ? 'Apply Bonus to All Payslips' : 'Apply Deduction to All Payslips'}
        open={Boolean(bulkMode)}
        onCancel={() => setBulkMode(null)}
        onOk={applyBulk}
        okText="Apply to All"
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text type="secondary">Amount</Text>
            <InputNumber
              value={bulkAmount}
              onChange={setBulkAmount}
              min={0}
              precision={2}
              style={{ width: '100%', marginTop: 4 }}
              placeholder="0.00"
            />
          </div>
          <div>
            <Text type="secondary">Comment (optional)</Text>
            <Input.TextArea
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              rows={2}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Void modal */}
      <Modal
        title="Void payroll run"
        open={Boolean(voidingRun)}
        okText="Void Run"
        okButtonProps={{ danger: true }}
        onCancel={() => { setVoidingRun(null); setVoidReason(''); }}
        onOk={async () => {
          if (!voidReason.trim()) { message.warning('Void reason is required.'); return; }
          await axios.post(api(`/api/hrm/payroll/runs/${voidingRun.id}/void`), { reason: voidReason });
          message.success('Payroll run voided.');
          setVoidingRun(null);
          setVoidReason('');
          loadDashboard();
        }}
      >
        <Input.TextArea
          rows={4}
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="Reason for voiding this payroll run"
        />
      </Modal>
    </AuthenticatedLayout>
  );
}
