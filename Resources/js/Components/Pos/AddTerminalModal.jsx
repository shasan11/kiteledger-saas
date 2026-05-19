import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  BankOutlined,
  HomeOutlined,
  PlusOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { api, showApiError } from '@/Pages/App/Pos/Shared/posHelpers';

const { Text } = Typography;

const EMPTY_ARRAY = [];

const normalizeRows = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return EMPTY_ARRAY;
};

const safeTrim = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const getRecordId = (record) => record?.id ?? record?.value ?? null;

const defaultLabelBuilder = (row) => {
  if (!row) return '';

  const main =
    row.name ||
    row.title ||
    row.company_name ||
    row.display_name ||
    row.email ||
    row.code ||
    String(row.id || '');

  if (row.code && row.name) return `${row.name} (${row.code})`;

  return main;
};

function QuickAddFormField({ field }) {
  if (field.type === 'number') {
    return (
      <InputNumber
        min={field.min}
        max={field.max}
        precision={field.precision}
        placeholder={field.placeholder}
        style={{ width: '100%' }}
      />
    );
  }

  if (field.type === 'switch') {
    return <Switch />;
  }

  if (field.type === 'textarea') {
    return <Input.TextArea rows={field.rows || 3} placeholder={field.placeholder} />;
  }

  if (field.type === 'select') {
    return (
      <Select
        allowClear={field.allowClear !== false}
        placeholder={field.placeholder}
        options={field.options || EMPTY_ARRAY}
      />
    );
  }

  return <Input placeholder={field.placeholder} />;
}

function QuickAddRemoteSelect({
  name,
  label,
  icon = null,
  required = false,
  disabled = false,
  placeholder = 'Search and select',
  apiUrl,
  params = {},
  valueKey = 'id',
  labelBuilder = defaultLabelBuilder,
  quickAddTitle,
  quickAddIcon = null,
  quickAddFields = EMPTY_ARRAY,
  quickAddInitialValues = {},
  createPayload,
  createUrl,
  messageApi,
  afterCreate,
}) {
  const { token } = theme.useToken();
  const form = Form.useFormInstance();
  const [quickForm] = Form.useForm();

  const [options, setOptions] = useState(EMPTY_ARRAY);
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);

  const searchTimerRef = useRef(null);
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);

  const loadOptions = useCallback(
    async (search = '') => {
      if (!apiUrl) return;

      setLoading(true);

      try {
        const response = await axios.get(apiUrl, {
          params: {
            page: 1,
            page_size: 30,
            search,
            ...(params || {}),
          },
        });

        const rows = normalizeRows(response.data);

        setOptions(
          rows
            .filter((row) => getRecordId(row) !== null)
            .map((row) => ({
              value: row?.[valueKey] ?? row?.id,
              label: labelBuilder(row),
              raw: row,
            })),
        );
      } catch {
        setOptions(EMPTY_ARRAY);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, paramsKey, valueKey, labelBuilder],
  );

  useEffect(() => {
    void loadOptions('');
  }, [loadOptions]);

  const openQuickAdd = () => {
    quickForm.resetFields();
    quickForm.setFieldsValue(quickAddInitialValues || {});
    setQuickOpen(true);
  };

  const submitQuickAdd = async () => {
    const values = await quickForm.validateFields();

    setQuickSaving(true);

    try {
      const payload =
        typeof createPayload === 'function'
          ? createPayload(values)
          : {
              ...values,
              active: values.active !== false,
            };

      const response = await axios.post(createUrl || apiUrl, payload);
      const saved = response.data;
      const savedId = saved?.[valueKey] ?? saved?.id;

      if (!savedId) {
        messageApi?.error(`${quickAddTitle || label} was created but no ID was returned.`);
        return;
      }

      const newOption = {
        value: savedId,
        label: labelBuilder(saved),
        raw: saved,
      };

      setOptions((prev) => {
        const exists = prev.some((item) => String(item.value) === String(savedId));
        return exists ? prev : [newOption, ...prev];
      });

      form.setFieldValue(name, savedId);

      if (typeof afterCreate === 'function') {
        afterCreate(saved, form);
      }

      setQuickOpen(false);
      quickForm.resetFields();
      messageApi?.success(`${quickAddTitle || label} added.`);
    } catch (error) {
      showApiError(messageApi, error, `Failed to add ${String(quickAddTitle || label).toLowerCase()}.`);
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <>
      <Form.Item
        name={name}
        label={
          <Space size={6}>
            {icon}
            <span>{label}</span>
          </Space>
        }
        rules={required ? [{ required: true, message: `${label} is required` }] : []}
      >
        <Space.Compact block>
          <Select
            showSearch
            allowClear
            disabled={disabled}
            loading={loading}
            placeholder={placeholder}
            filterOption={false}
            options={options}
            onFocus={() => {
              if (!options.length) void loadOptions('');
            }}
            onSearch={(value) => {
              if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
              searchTimerRef.current = setTimeout(() => {
                void loadOptions(value || '');
              }, 350);
            }}
            style={{ width: '100%' }}
          />

          <Button
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={openQuickAdd}
            title={`Quick add ${quickAddTitle || label}`}
          />
        </Space.Compact>
      </Form.Item>

      <Modal
        title={
          <Space>
            {quickAddIcon}
            <span>Quick Add {quickAddTitle || label}</span>
          </Space>
        }
        open={quickOpen}
        onCancel={() => setQuickOpen(false)}
        onOk={submitQuickAdd}
        confirmLoading={quickSaving}
        destroyOnClose
        okText="Save"
        width={620}
      >
        <Form
          form={quickForm}
          layout="vertical"
          initialValues={quickAddInitialValues}
          style={{ marginTop: token.marginMD }}
        >
          <Row gutter={[12, 0]}>
            {quickAddFields.map((field) => (
              <Col xs={24} md={field.col || 24} key={field.name}>
                <Form.Item
                  name={field.name}
                  label={field.label}
                  valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                  rules={field.rules || EMPTY_ARRAY}
                >
                  <QuickAddFormField field={field} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </>
  );
}

export default function AddTerminalModal({
  open,
  loading = false,
  messageApi,
  defaultBranchId = null,
  canViewAllBranches = false,
  onCancel,
  onSubmit,
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const selectedBranchId = Form.useWatch('branch_id', form) || defaultBranchId;

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

  const branchQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Branch Name',
        placeholder: 'Main Branch',
        rules: [{ required: true, message: 'Branch name is required' }],
      },
      {
        name: 'code',
        label: 'Code',
        col: 12,
        placeholder: 'HO',
        rules: [{ required: true, message: 'Code is required' }],
      },
      {
        name: 'phone',
        label: 'Phone',
        col: 12,
        placeholder: '+977...',
      },
      {
        name: 'email',
        label: 'Email',
        col: 12,
        placeholder: 'branch@example.com',
      },
      {
        name: 'address',
        label: 'Address',
        col: 12,
        placeholder: 'Kathmandu',
      },
      {
        name: 'is_pos_enabled',
        label: 'POS Enabled',
        type: 'switch',
        col: 12,
      },
      {
        name: 'is_warehouse_enabled',
        label: 'Warehouse Enabled',
        type: 'switch',
        col: 12,
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
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
      {
        name: 'code',
        label: 'Code',
        col: 12,
        placeholder: 'WH-001',
      },
      {
        name: 'address',
        label: 'Address',
        col: 12,
        placeholder: 'Warehouse address',
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
    ],
    [],
  );

  const accountQuickFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Account Name',
        placeholder: 'POS Cash Account',
        rules: [{ required: true, message: 'Account name is required' }],
      },
      {
        name: 'code',
        label: 'Code',
        col: 12,
        placeholder: 'POS-CASH',
      },
      {
        name: 'opening_balance',
        label: 'Opening Balance',
        type: 'number',
        col: 12,
        min: 0,
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
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
      {
        name: 'code',
        label: 'Code',
        col: 12,
        placeholder: 'WALK-IN',
      },
      {
        name: 'phone',
        label: 'Phone',
        col: 12,
        placeholder: '+977...',
      },
      {
        name: 'email',
        label: 'Email',
        col: 12,
        placeholder: 'customer@example.com',
      },
      {
        name: 'credit_limit',
        label: 'Credit Limit',
        type: 'number',
        col: 12,
        min: 0,
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        col: 24,
        placeholder: 'Customer address',
      },
      {
        name: 'active',
        label: 'Active',
        type: 'switch',
        col: 12,
      },
    ],
    [],
  );

  const createBranchPayload = (values) => ({
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
  });

  const createWarehousePayload = (values) => ({
    branch_id: selectedBranchId,
    name: safeTrim(values.name),
    code: safeTrim(values.code),
    address: safeTrim(values.address),
    active: values.active !== false,
  });

  const createAccountPayload = (values, nature) => {
    const openingBalance = Number(values.opening_balance || 0);

    return {
      name: safeTrim(values.name),
      code: safeTrim(values.code),
      nature,
      dr_amount: openingBalance,
      cr_amount: 0,
      balance: openingBalance,
      active: values.active !== false,
    };
  };

  const createCustomerPayload = (values) => ({
    contact_type: 'customer',
    name: safeTrim(values.name),
    code: safeTrim(values.code),
    phone: safeTrim(values.phone),
    email: safeTrim(values.email),
    address: safeTrim(values.address),
    accept_purchase: false,
    credit_limit: Number(values.credit_limit || 0),
    active: values.active !== false,
  });

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
              params={{ active: true }}
              messageApi={messageApi}
              quickAddTitle="Branch"
              quickAddFields={branchQuickFields}
              quickAddInitialValues={{
                is_pos_enabled: true,
                is_warehouse_enabled: true,
                active: true,
              }}
              createPayload={createBranchPayload}
              afterCreate={(branch) => {
                form.setFieldValue('branch_id', branch?.id);
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
              apiUrl={api('/api/warehouses')}
              createUrl={api('/api/warehouses')}
              params={{
                active: true,
                ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
              }}
              messageApi={messageApi}
              quickAddTitle="Warehouse"
              quickAddFields={warehouseQuickFields}
              quickAddInitialValues={{
                active: true,
              }}
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
              required
              apiUrl={api('/api/accounts')}
              createUrl={api('/api/accounts')}
              params={{ active: true, nature: 'cash' }}
              messageApi={messageApi}
              quickAddTitle="Cash Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{
                opening_balance: 0,
                active: true,
              }}
              createPayload={(values) => createAccountPayload(values, 'cash')}
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
              params={{ active: true, nature: 'bank' }}
              messageApi={messageApi}
              quickAddTitle="Card / Bank Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{
                opening_balance: 0,
                active: true,
              }}
              createPayload={(values) => createAccountPayload(values, 'bank')}
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
              params={{ active: true, nature: 'bank' }}
              messageApi={messageApi}
              quickAddTitle="Online / Bank Account"
              quickAddFields={accountQuickFields}
              quickAddInitialValues={{
                opening_balance: 0,
                active: true,
              }}
              createPayload={(values) => createAccountPayload(values, 'bank')}
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
              params={{ active: true, contact_type: 'customer' }}
              messageApi={messageApi}
              quickAddTitle="Customer"
              quickAddFields={customerQuickFields}
              quickAddInitialValues={{
                name: 'Walk-in Customer',
                code: 'WALK-IN',
                credit_limit: 0,
                active: true,
              }}
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
                  Branch, Warehouse, Cash Account, Card Account, Online Account, and Default Customer can be created directly from this terminal form.
                </Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}