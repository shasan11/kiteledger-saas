import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
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
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  BankOutlined,
  HomeOutlined,
  PlusOutlined,
  PrinterOutlined,
  ShopOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const EMPTY_ARRAY = [];

const safeTrim = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return token
    ? {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : {
        Accept: 'application/json',
      };
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return EMPTY_ARRAY;
};

const normalizeCreatedRecord = (payload) =>
  payload?.data || payload?.account || payload?.branch || payload?.warehouse || payload?.contact || payload;

const defaultLabelBuilder = (row) => {
  if (!row) return '';
  if (row.name && row.code) return `${row.name} (${row.code})`;

  return (
    row.name ||
    row.display_name ||
    row.company_name ||
    row.email ||
    row.code ||
    String(row.id || '')
  );
};

async function postJson(url, payload) {
  const response = await axios.post(url, payload, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

function QuickAddField({ field }) {
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

function RemoteSelect({
  value,
  onChange,
  apiUrl,
  createUrl,
  params = {},
  disabled = false,
  placeholder = 'Search and select',
  labelBuilder = defaultLabelBuilder,
  valueKey = 'id',
  quickAddTitle,
  quickAddFields = EMPTY_ARRAY,
  quickAddInitialValues = {},
  createPayload,
  afterCreate,
}) {
  const { message } = App.useApp();
  const { token } = theme.useToken();

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
          headers: getAuthHeaders(),
        });

        const rows = normalizeRows(response.data);

        setOptions(
          rows
            .filter((row) => (row?.[valueKey] ?? row?.id) != null)
            .map((row) => ({
              value: row?.[valueKey] ?? row?.id,
              label: labelBuilder(row),
              raw: row,
            }))
        );
      } catch {
        setOptions(EMPTY_ARRAY);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, paramsKey, valueKey, labelBuilder]
  );

  useEffect(() => {
    if (!disabled) {
      void loadOptions('');
    }
  }, [disabled, loadOptions]);

  const handleSearch = (searchText) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      void loadOptions(searchText || '');
    }, 300);
  };

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

      const response = await postJson(createUrl || apiUrl, payload);
      const saved = normalizeCreatedRecord(response);
      const savedId = saved?.[valueKey] ?? saved?.id;

      if (!savedId) {
        message.error(`${quickAddTitle || 'Record'} was created but no ID was returned.`);
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

      onChange?.(savedId);

      if (typeof afterCreate === 'function') {
        afterCreate(saved);
      }

      setQuickOpen(false);
      quickForm.resetFields();
      message.success(`${quickAddTitle || 'Record'} added.`);
    } catch (error) {
      const data = error?.response?.data || {};
      const errorMessage =
        data.message ||
        data.detail ||
        data.error ||
        Object.values(data.errors || {})?.flat?.()?.[0] ||
        error?.message ||
        `Failed to add ${String(quickAddTitle || 'record').toLowerCase()}.`;

      message.error(errorMessage);
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <>
      <Space.Compact block>
        <Select
          showSearch
          allowClear
          value={value}
          disabled={disabled}
          loading={loading}
          placeholder={placeholder}
          filterOption={false}
          options={options}
          onFocus={() => {
            if (!options.length) void loadOptions('');
          }}
          onSearch={handleSearch}
          onChange={onChange}
          style={{ width: '100%' }}
        />

        <Button
          icon={<PlusOutlined />}
          disabled={disabled || !quickAddFields.length}
          onClick={openQuickAdd}
          title="Quick add"
        />
      </Space.Compact>

      <Modal
        title={`Quick Add ${quickAddTitle || 'Record'}`}
        open={quickOpen}
        onCancel={() => setQuickOpen(false)}
        onOk={submitQuickAdd}
        confirmLoading={quickSaving}
        okText="Save"
        width={620}
        destroyOnClose
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
                  <QuickAddField field={field} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </>
  );
}

function RemoteFormItem({
  name,
  label,
  icon,
  required = false,
  rules = [],
  children,
}) {
  const labelNode = icon ? (
    <Space size={6}>
      {icon}
      <span>{label}</span>
    </Space>
  ) : (
    label
  );

  return (
    <Form.Item
      name={name}
      label={labelNode}
      rules={[
        ...(required ? [{ required: true, message: `${label} is required` }] : []),
        ...rules,
      ]}
    >
      {children}
    </Form.Item>
  );
}

export default function AddTerminalModal({
  open,
  loading = false,
  defaultBranchId = null,
  defaultFloorName = 'Main Floor',
  canViewAllBranches = false,
  onCancel,
  onSubmit,
}) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

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

  const branchParams = useMemo(() => ({ active: true }), []);

  const warehouseParams = useMemo(
    () => ({
      active: true,
      ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
    }),
    [selectedBranchId]
  );

  const cashParams = useMemo(() => ({ active: true, nature: 'cash' }), []);
  const bankParams = useMemo(() => ({ active: true, nature: 'bank' }), []);
  const customerParams = useMemo(
    () => ({
      active: true,
      contact_type: 'customer',
    }),
    []
  );

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
    []
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
    []
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
    []
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
    []
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

  const createCustomerPayload = (values) => ({
    contact_type: 'customer',
    type: 'customer',
    name: safeTrim(values.name),
    code: safeTrim(values.code),
    phone: safeTrim(values.phone),
    email: safeTrim(values.email),
    address: safeTrim(values.address),
    accept_purchase: false,
    credit_limit: Number(values.credit_limit || 0),
    active: values.active !== false,
  });

  const createAccountPayload = (nature) => (values) => {
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      await onSubmit?.(
        {
          ...values,
          branch_id: canViewAllBranches
            ? values.branch_id || defaultBranchId
            : defaultBranchId,
          warehouse_id: values.warehouse_id || null,
          cash_account_id: values.cash_account_id || null,
          card_account_id: values.card_account_id || null,
          online_account_id: values.online_account_id || null,
          default_customer_id: values.default_customer_id || null,
          code: safeTrim(values.code),
          location: safeTrim(values.location),
          floor_name: safeTrim(values.floor_name) || 'Main Floor',
          x_position: Number(values.x_position || 24),
          y_position: Number(values.y_position || 24),
          sort_order: Number(values.sort_order || 0),
          receipt_printer_name: safeTrim(values.receipt_printer_name),
          is_default: Boolean(values.is_default),
          active: values.active !== false,
        },
        form
      );
    } catch (error) {
      if (error?.errorFields) {
        message.error('Please fill the required terminal details.');
      }
    }
  };

  return (
    <Drawer
      title={
        <Space size={8}>
          <ShopOutlined />
          <span>Add POS Terminal</span>
        </Space>
      }
      open={open}
      onClose={onCancel}
      width="min(680px, 100vw)"
      destroyOnClose
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: token.marginSM,
          }}
        >
          <Button onClick={onCancel}>Cancel</Button>

          <Button type="primary" loading={loading} onClick={handleSubmit}>
            Save Terminal
          </Button>
        </div>
      }
      styles={{
        body: {
          paddingBottom: 72,
          background: token.colorBgLayout,
        },
        footer: {
          position: 'sticky',
          bottom: 0,
          zIndex: 1,
          background: token.colorBgElevated,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          branch_id: canViewAllBranches ? undefined : defaultBranchId,
          floor_name: defaultFloorName || 'Main Floor',
          x_position: 24,
          y_position: 24,
          sort_order: 0,
          is_default: false,
          active: true,
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div
            style={{
              padding: token.paddingMD,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
            }}
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
                  <Input placeholder="Auto-generated" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <RemoteFormItem
                  name="branch_id"
                  label="Branch"
                  icon={<HomeOutlined />}
                  required
                >
                  <RemoteSelect
                    disabled={!canViewAllBranches}
                    apiUrl={api('/api/branches')}
                    createUrl={api('/api/branches')}
                    params={branchParams}
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
                </RemoteFormItem>
              </Col>

              <Col xs={24} md={12}>
                <RemoteFormItem
                  name="warehouse_id"
                  label="Warehouse"
                  icon={<ShopOutlined />}
                  required
                >
                  <RemoteSelect
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
                </RemoteFormItem>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="location" label="Location">
                  <Input placeholder="Main counter / front desk" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="floor_name" label="Floor">
                  <Input placeholder="Main Floor" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="receipt_printer_name"
                  label={
                    <Space size={6}>
                      <PrinterOutlined />
                      <span>Receipt Printer</span>
                    </Space>
                  }
                >
                  <Input placeholder="Optional printer name" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div
            style={{
              padding: token.paddingMD,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
            }}
          >
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <Tag color="blue">Payment Accounts</Tag>
            </Divider>

            <Row gutter={[14, 0]}>
              <Col xs={24} md={8}>
                <RemoteFormItem
                  name="cash_account_id"
                  label="Cash Account"
                  icon={<WalletOutlined />}
                >
                  <RemoteSelect
                    apiUrl={api('/api/accounts')}
                    createUrl={api('/api/accounts')}
                    params={cashParams}
                    quickAddTitle="Cash Account"
                    quickAddFields={accountQuickFields}
                    quickAddInitialValues={{
                      opening_balance: 0,
                      active: true,
                    }}
                    createPayload={createAccountPayload('cash')}
                  />
                </RemoteFormItem>
              </Col>

              <Col xs={24} md={8}>
                <RemoteFormItem
                  name="card_account_id"
                  label="Card Account"
                  icon={<BankOutlined />}
                >
                  <RemoteSelect
                    apiUrl={api('/api/accounts')}
                    createUrl={api('/api/accounts')}
                    params={bankParams}
                    quickAddTitle="Card Account"
                    quickAddFields={accountQuickFields}
                    quickAddInitialValues={{
                      opening_balance: 0,
                      active: true,
                    }}
                    createPayload={createAccountPayload('bank')}
                  />
                </RemoteFormItem>
              </Col>

              <Col xs={24} md={8}>
                <RemoteFormItem
                  name="online_account_id"
                  label="Online Account"
                  icon={<BankOutlined />}
                >
                  <RemoteSelect
                    apiUrl={api('/api/accounts')}
                    createUrl={api('/api/accounts')}
                    params={bankParams}
                    quickAddTitle="Online Account"
                    quickAddFields={accountQuickFields}
                    quickAddInitialValues={{
                      opening_balance: 0,
                      active: true,
                    }}
                    createPayload={createAccountPayload('bank')}
                  />
                </RemoteFormItem>
              </Col>
            </Row>
          </div>

          <div
            style={{
              padding: token.paddingMD,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
            }}
          >
            <Divider orientation="left" style={{ marginTop: 0 }}>
              <Tag color="green">Customer & Status</Tag>
            </Divider>

            <Row gutter={[14, 0]}>
              <Col xs={24} md={12}>
                <RemoteFormItem
                  name="default_customer_id"
                  label="Default Customer"
                  icon={<UserOutlined />}
                  required
                >
                  <RemoteSelect
                    apiUrl={api('/api/contacts')}
                    createUrl={api('/api/contacts')}
                    params={customerParams}
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
                </RemoteFormItem>
              </Col>

              <Col xs={12} md={6}>
                <Form.Item
                  name="is_default"
                  label="Default Terminal"
                  valuePropName="checked"
                >
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
                   
                </div>
              </Col>
            </Row>
          </div>
        </Space>
      </Form>
    </Drawer>
  );
}
