import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import QuickAddRemoteSelect from '@/Components/QuickAddRemoteSelect';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const safeTrim = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  return match ? match.split('=')[1] : null;
};

const postJson = async (url, payload) => {
  const xsrfToken = getCookie('XSRF-TOKEN');
  const csrfToken = getCookie('csrftoken');

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(xsrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken) } : {}),
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.detail ||
      data?.error ||
      Object.values(data?.errors || {}).flat().join(', ') ||
      'Could not create account.';

    throw new Error(errorMessage);
  }

  return data;
};

const normalizeCreatedRecord = (data) => {
  return data?.data || data?.account || data?.result || data;
};

const accountQuickAddSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Account name is required')
    .max(150, 'Account name is too long'),
  code: Yup.string()
    .trim()
    .nullable()
    .max(50, 'Code is too long'),
  opening_balance: Yup.number()
    .typeError('Opening balance must be a number')
    .min(0, 'Opening balance cannot be negative')
    .required('Opening balance is required'),
  active: Yup.boolean(),
});

const ACCOUNT_QUICK_CONFIG = {
  cash: {
    label: 'Cash Account',
    title: 'Quick Add Cash Account',
    fieldName: 'cash_account_id',
    nature: 'cash',
    placeholder: 'POS Cash Account',
  },
  card: {
    label: 'Card Account',
    title: 'Quick Add Card / Bank Account',
    fieldName: 'card_account_id',
    nature: 'bank',
    placeholder: 'POS Card Account',
  },
  online: {
    label: 'Online Account',
    title: 'Quick Add Online / Bank Account',
    fieldName: 'online_account_id',
    nature: 'bank',
    placeholder: 'POS Online Account',
  },
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

  const [accountQuickOpen, setAccountQuickOpen] = useState(false);
  const [accountQuickType, setAccountQuickType] = useState('cash');
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  const selectedBranchId = Form.useWatch('branch_id', form) ?? defaultBranchId;

  const accountQuickConfig = useMemo(() => {
    return ACCOUNT_QUICK_CONFIG[accountQuickType] || ACCOUNT_QUICK_CONFIG.cash;
  }, [accountQuickType]);

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
    [selectedBranchId],
  );

  const cashParams = useMemo(() => ({ active: true, nature: 'cash' }), []);
  const bankParams = useMemo(() => ({ active: true, nature: 'bank' }), []);
  const customerParams = useMemo(() => ({ active: true, contact_type: 'customer' }), []);

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

  const createWarehousePayload = (values) => ({
    branch_id: selectedBranchId,
    name: safeTrim(values.name),
    code: safeTrim(values.code),
    address: safeTrim(values.address),
    active: values.active !== false,
  });

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

  const openAccountQuickAdd = (type) => {
    setAccountQuickType(type);
    setAccountQuickOpen(true);
  };

  const closeAccountQuickAdd = () => {
    setAccountQuickOpen(false);
  };

  const handleAccountQuickSubmit = async (values, helpers) => {
    try {
      const openingBalance = Number(values.opening_balance || 0);

      const payload = {
        name: safeTrim(values.name),
        code: safeTrim(values.code),
        nature: accountQuickConfig.nature,
        dr_amount: openingBalance,
        cr_amount: 0,
        balance: openingBalance,
        active: values.active !== false,
      };

      const response = await postJson(api('/api/accounts'), payload);
      const createdAccount = normalizeCreatedRecord(response);

      if (!createdAccount?.id) {
        throw new Error('Account created but API did not return account id.');
      }

      form.setFieldValue(accountQuickConfig.fieldName, createdAccount.id);
      setAccountRefreshKey((prev) => prev + 1);

      message.success(`${accountQuickConfig.label} created`);
      helpers.resetForm();
      setAccountQuickOpen(false);
    } catch (error) {
      message.error(error?.message || 'Could not create account.');
    } finally {
      helpers.setSubmitting(false);
    }
  };

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

  const getFormikItemStatus = (formik, name) => {
    const hasError = formik.touched[name] && formik.errors[name];

    return {
      validateStatus: hasError ? 'error' : undefined,
      help: hasError ? formik.errors[name] : undefined,
    };
  };

  return (
    <>
      <Drawer
        title="Add POS Terminal"
        open={open}
        onCancel={onCancel}
        onClose={onCancel}
        width="min(640px, 100vw)"
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: token.marginSM }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" loading={loading} onClick={handleSubmit}>
              Save
            </Button>
          </div>
        }
        styles={{
          body: { paddingBottom: 72 },
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
                <Input placeholder="Auto-generated" readOnly disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <QuickAddRemoteSelect
                name="branch_id"
                label="Branch"
                required
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
                onSelectChange={() => {
                  form.setFieldValue('warehouse_id', undefined);
                }}
              />
            </Col>

            <Col xs={24} md={12}>
              <QuickAddRemoteSelect
                name="warehouse_id"
                label="Warehouse"
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
                key={`cash-account-${accountRefreshKey}`}
                name="cash_account_id"
                label="Cash Account"
                apiUrl={api('/api/accounts')}
                params={cashParams}
              />

              <Button
                type="link"
                size="small"
                onClick={() => openAccountQuickAdd('cash')}
                style={{ paddingLeft: 0, marginTop: -8 }}
              >
                Quick add cash account
              </Button>
            </Col>

            <Col xs={24} md={8}>
              <QuickAddRemoteSelect
                key={`card-account-${accountRefreshKey}`}
                name="card_account_id"
                label="Card Account"
                apiUrl={api('/api/accounts')}
                params={bankParams}
              />

              <Button
                type="link"
                size="small"
                onClick={() => openAccountQuickAdd('card')}
                style={{ paddingLeft: 0, marginTop: -8 }}
              >
                Quick add card account
              </Button>
            </Col>

            <Col xs={24} md={8}>
              <QuickAddRemoteSelect
                key={`online-account-${accountRefreshKey}`}
                name="online_account_id"
                label="Online Account"
                apiUrl={api('/api/accounts')}
                params={bankParams}
              />

              <Button
                type="link"
                size="small"
                onClick={() => openAccountQuickAdd('online')}
                style={{ paddingLeft: 0, marginTop: -8 }}
              >
                Quick add online account
              </Button>
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
                required
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
            </Col>

            <Col xs={12} md={6}>
              <Form.Item name="is_default" label="Default Terminal" valuePropName="checked">
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
                    Customer can be created directly from this form.
                  </Text>
                </Space>
              </div>
            </Col>
          </Row>
        </Form>
      </Drawer>

      <Formik
        enableReinitialize
        initialValues={{
          name: '',
          code: '',
          opening_balance: 0,
          active: true,
        }}
        validationSchema={accountQuickAddSchema}
        onSubmit={handleAccountQuickSubmit}
      >
        {(formik) => (
          <Modal
            title={accountQuickConfig.title}
            open={accountQuickOpen}
            onCancel={() => {
              formik.resetForm();
              closeAccountQuickAdd();
            }}
            onOk={formik.handleSubmit}
            confirmLoading={formik.isSubmitting}
            okText="Create Account"
            width={520}
            destroyOnClose
          >
            <FormikForm>
              <Row gutter={[14, 0]}>
                <Col span={24}>
                  <Form.Item
                    label="Account Name"
                    required
                    {...getFormikItemStatus(formik, 'name')}
                  >
                    <Input
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder={accountQuickConfig.placeholder}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Code" {...getFormikItemStatus(formik, 'code')}>
                    <Input
                      name="code"
                      value={formik.values.code}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="POS-CASH"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Opening Balance"
                    required
                    {...getFormikItemStatus(formik, 'opening_balance')}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      value={formik.values.opening_balance}
                      onChange={(value) => {
                        formik.setFieldValue('opening_balance', value ?? 0);
                      }}
                      onBlur={() => {
                        formik.setFieldTouched('opening_balance', true);
                      }}
                      placeholder="0"
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item label="Active">
                    <Switch
                      checked={formik.values.active}
                      onChange={(checked) => {
                        formik.setFieldValue('active', checked);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </FormikForm>
          </Modal>
        )}
      </Formik>
    </>
  );
}
