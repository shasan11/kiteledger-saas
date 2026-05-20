import { useEffect, useMemo } from 'react';
import {
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  BankOutlined,
  HomeOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import QuickAddRemoteSelect from '@/Components/QuickAddRemoteSelect';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const safeTrim = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

export default function AddTerminalModal({
  open,
  loading = false,
  defaultBranchId = null,
  canViewAllBranches = false,
  onCancel,
  onSubmit,
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  // Track branch selection so we can filter warehouses and disable quick-add
  // when no branch is chosen. Form.useWatch works correctly because QuickAddRemoteSelect
  // now uses a proper controlled CompactSelect that bridges Form.Item value/onChange.
  const selectedBranchId = Form.useWatch('branch_id', form) ?? defaultBranchId;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      name: '',
      code: '',
      branch_id: canViewAllBranches ? undefined : defaultBranchId,
      warehouse_id: undefined,
      location: '',
      receipt_printer_name: '',
      cash_account_id: undefined,
      card_account_id: undefined,
      online_account_id: undefined,
      default_customer_id: undefined,
      is_default: false,
      active: true,
    });
  }, [open, form, defaultBranchId, canViewAllBranches]);

  // Memoize params objects so QuickAddRemoteSelect's paramsKey doesn't
  // regenerate on every render when content hasn't changed.
  const branchParams = useMemo(() => ({ active: true }), []);

  const warehouseParams = useMemo(
    () => ({
      active: true,
      ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
    }),
    [selectedBranchId],
  );

  const cashParams = useMemo(() => ({ active: true, nature: 'cash' }), []);
  const bankParams = useMemo(() => ({ active: true, nature: 'bank' }), []);
  const customerParams = useMemo(() => ({ active: true, contact_type: 'customer' }), []);

  // Quick-add field definitions
  const branchQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Branch Name',
        placeholder: 'Main Branch',
        rules: [{ required: true, message: 'Branch name is required' }],
      },
      { name: 'code', label: 'Code', col: 12, placeholder: 'HO', rules: [{ required: true, message: 'Code is required' }] },
      { name: 'phone', label: 'Phone', col: 12, placeholder: '+977...' },
      { name: 'email', label: 'Email', col: 12, placeholder: 'branch@example.com' },
      { name: 'address', label: 'Address', col: 12, placeholder: 'Kathmandu' },
      { name: 'is_pos_enabled', label: 'POS Enabled', type: 'switch', col: 12 },
      { name: 'is_warehouse_enabled', label: 'Warehouse Enabled', type: 'switch', col: 12 },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ],
    [],
  );

  const warehouseQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Warehouse Name',
        placeholder: 'Main Warehouse',
        rules: [{ required: true, message: 'Warehouse name is required' }],
      },
      { name: 'code', label: 'Code', col: 12, placeholder: 'WH-001' },
      { name: 'address', label: 'Address', col: 12, placeholder: 'Warehouse address' },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ],
    [],
  );

  const accountQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Account Name',
        placeholder: 'POS Account',
        rules: [{ required: true, message: 'Account name is required' }],
      },
      { name: 'code', label: 'Code', col: 12, placeholder: 'POS-CASH' },
      { name: 'opening_balance', label: 'Opening Balance', type: 'number', col: 12, min: 0 },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ],
    [],
  );

  const customerQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Customer Name',
        placeholder: 'Walk-in Customer',
        rules: [{ required: true, message: 'Customer name is required' }],
      },
      { name: 'code', label: 'Code', col: 12, placeholder: 'WALK-IN' },
      { name: 'phone', label: 'Phone', col: 12, placeholder: '+977...' },
      { name: 'email', label: 'Email', col: 12, placeholder: 'customer@example.com' },
      { name: 'credit_limit', label: 'Credit Limit', type: 'number', col: 12, min: 0 },
      { name: 'address', label: 'Address', type: 'textarea', col: 24, placeholder: 'Customer address' },
      { name: 'active', label: 'Active', type: 'switch', col: 12 },
    ],
    [],
  );

  // Payload factories — called inside QuickAddRemoteSelect.submitQuickAdd
  const createBranchPayload = useMemo(
    () => (values) => ({
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      phone: safeTrim(values.phone),
      email: safeTrim(values.email),
      address: safeTrim(values.address),
      is_head_office: false,
      is_transaction_enabled: true,
      is_pos_enabled: values.is_pos_enabled !== false,
      is_warehouse_enabled: values.is_warehouse_enabled !== false,
      is_ai_enabled: false,
      is_billing_location_enabled: false,
      abbreviated_tax_enabled: false,
      track_location: false,
      active: values.active !== false,
    }),
    [],
  );

  // createWarehousePayload is NOT memoized because it reads selectedBranchId
  // which can change. We want the latest value each time the quick-add fires.
  const createWarehousePayload = (values) => ({
    branch_id: selectedBranchId,
    name: safeTrim(values.name),
    code: safeTrim(values.code),
    address: safeTrim(values.address),
    active: values.active !== false,
  });

  const createCashAccountPayload = useMemo(
    () => (values) => ({
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      nature: 'cash',
      dr_amount: Number(values.opening_balance || 0),
      cr_amount: 0,
      balance: Number(values.opening_balance || 0),
      active: values.active !== false,
    }),
    [],
  );

  const createBankAccountPayload = useMemo(
    () => (values) => ({
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      nature: 'bank',
      dr_amount: Number(values.opening_balance || 0),
      cr_amount: 0,
      balance: Number(values.opening_balance || 0),
      active: values.active !== false,
    }),
    [],
  );

  const createCustomerPayload = useMemo(
    () => (values) => ({
      contact_type: 'customer',
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      phone: safeTrim(values.phone),
      email: safeTrim(values.email),
      address: safeTrim(values.address),
      accept_purchase: false,
      credit_limit: Number(values.credit_limit || 0),
      active: values.active !== false,
    }),
    [],
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit?.(
      {
        ...values,
        branch_id: canViewAllBranches ? values.branch_id || defaultBranchId : defaultBranchId,
        warehouse_id: values.warehouse_id || null,
        cash_account_id: values.cash_account_id || null,
        card_account_id: values.card_account_id || null,
        online_account_id: values.online_account_id || null,
        default_customer_id: values.default_customer_id || null,
        code: safeTrim(values.code),
        location: safeTrim(values.location),
        receipt_printer_name: safeTrim(values.receipt_printer_name),
        is_default: Boolean(values.is_default),
        active: values.active !== false,
      },
      form,
    );
  };

  return (
    <Modal
      title="Add POS Terminal"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Create Terminal"
      width={920}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          branch_id: canViewAllBranches ? undefined : defaultBranchId,
          is_default: false,
          active: true,
        }}
        style={{ marginTop: token.marginMD }}
      >
        <Row gutter={[14, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Terminal Name"
              rules={[{ required: true, message: 'Terminal name is required' }]}
            >
              <Input placeholder="Main Counter POS" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="code" label="Terminal Code">
              <Input placeholder="POS-HO-01" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <QuickAddRemoteSelect
              name="branch_id"
              label="Branch"
              icon={<HomeOutlined />}
              quickAddIcon={<HomeOutlined />}
              required
              disabled={!canViewAllBranches}
              apiUrl={api('/api/branches')}
              createUrl={api('/api/branches')}
              params={branchParams}
              quickAddTitle="Branch"
              quickAddFields={branchQuickFields}
              quickAddInitialValues={{ is_pos_enabled: true, is_warehouse_enabled: true, active: true }}
              createPayload={createBranchPayload}
              afterCreate={(branch) => {
                form.setFieldValue('branch_id', branch?.id);
                form.setFieldValue('warehouse_id', undefined);
              }}
              onSelectChange={() => {
                // When user selects a different branch from the dropdown,
                // the warehouse for the old branch is no longer valid.
                form.setFieldValue('warehouse_id', undefined);
              }}
            />
          </Col>

          <Col xs={24} md={12}>
            <QuickAddRemoteSelect
              name="warehouse_id"
              label="Warehouse"
              icon={<ShopOutlined />}
              quickAddIcon={<ShopOutlined />}
              required
              disabled={!selectedBranchId}
              placeholder={selectedBranchId ? 'Search warehouse' : 'Select branch first'}
              apiUrl={api('/api/warehouses')}
              createUrl={api('/api/warehouses')}
              params={warehouseParams}
              quickAddTitle="Warehouse"
              quickAddFields={warehouseQuickFields}
              quickAddInitialValues={{ active: true }}
              createPayload={createWarehousePayload}
            />
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="location" label="Location">
              <Input placeholder="Main counter / front desk" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="receipt_printer_name" label="Receipt Printer Name">
              <Input placeholder="Optional printer name" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Divider style={{ margin: `${token.marginSM}px 0 ${token.marginMD}px` }}>
              <Tag color="blue">Payment Accounts</Tag>
            </Divider>
          </Col>

          <Col xs={24} md={8}>
            <QuickAddRemoteSelect
              name="cash_account_id"
              label="Cash Account"
              icon={<BankOutlined />}
              quickAddIcon={<BankOutlined />}
               apiUrl={api('/api/accounts')}
              createUrl={api('/api/accounts')}
              params={cashParams}
              quickAddTitle="Cash Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{ opening_balance: 0, active: true }}
              createPayload={createCashAccountPayload}
            />
          </Col>

          <Col xs={24} md={8}>
            <QuickAddRemoteSelect
              name="card_account_id"
              label="Card Account"
              icon={<BankOutlined />}
              quickAddIcon={<BankOutlined />}
              apiUrl={api('/api/accounts')}
              createUrl={api('/api/accounts')}
              params={bankParams}
              quickAddTitle="Card / Bank Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{ opening_balance: 0, active: true }}
              createPayload={createBankAccountPayload}
            />
          </Col>

          <Col xs={24} md={8}>
            <QuickAddRemoteSelect
              name="online_account_id"
              label="Online Account"
              icon={<BankOutlined />}
              quickAddIcon={<BankOutlined />}
              apiUrl={api('/api/accounts')}
              createUrl={api('/api/accounts')}
              params={bankParams}
              quickAddTitle="Online / Bank Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{ opening_balance: 0, active: true }}
              createPayload={createBankAccountPayload}
            />
          </Col>

          <Col span={24}>
            <Divider style={{ margin: `${token.marginSM}px 0 ${token.marginMD}px` }}>
              <Tag color="green">Default Customer</Tag>
            </Divider>
          </Col>

          <Col xs={24} md={12}>
            <QuickAddRemoteSelect
              name="default_customer_id"
              label="Default Customer"
              icon={<TeamOutlined />}
              quickAddIcon={<TeamOutlined />}
              required
              apiUrl={api('/api/contacts')}
              createUrl={api('/api/contacts')}
              params={customerParams}
              quickAddTitle="Customer"
              quickAddFields={customerQuickFields}
              quickAddInitialValues={{ name: 'Walk-in Customer', code: 'WALK-IN', credit_limit: 0, active: true }}
              createPayload={createCustomerPayload}
            />
          </Col>

          <Col xs={12} md={6}>
            <Form.Item name="is_default" label="Default Terminal" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col xs={12} md={6}>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>

          <Col span={24}>
            <div
              style={{
                marginTop: token.marginXS,
                padding: token.paddingSM,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
              }}
            >
              <Space direction="vertical" size={2}>
                <Text strong>Quick add enabled</Text>
                <Text type="secondary">
                  Branch, Warehouse, Cash Account, Card Account, Online Account, and Default
                  Customer can be created directly from this form using the + button.
                </Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
