import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch, message } from 'antd';
import axios from 'axios';
import { api, cleanPayload, fetchList } from './settingsApi';

const titles = {
  accounting: 'Accounting Configuration',
  hrm: 'HRM Configuration',
  inventory: 'Inventory Configuration',
  sales: 'Sales Configuration',
  purchase: 'Purchase Configuration',
};

const accountField = (name, label, accounts) => (
  <Col xs={24} md={8}><Form.Item name={name} label={label}><Select allowClear showSearch options={accounts} optionFilterProp="label" /></Form.Item></Col>
);

export default function ConfigurationForm({ auth, area }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [taxes, setTaxes] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(api(`/api/settings/configurations/${area}`)),
      fetchList('/api/chart-of-accounts', { page_size: 100 }),
      fetchList('/api/warehouses', { page_size: 100 }),
      fetchList('/api/tax-rates', { page_size: 100 }),
    ]).then(([config, accountRows, warehouseRows, taxRows]) => {
      form.setFieldsValue(config.data || {});
      setAccounts(accountRows.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name}`.trim() })));
      setWarehouses(warehouseRows.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name}`.trim() })));
      setTaxes(taxRows.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.name} (${item.rate_percent || 0}%)`.trim() })));
    });
  }, [area, form]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(api(`/api/settings/configurations/${area}`), cleanPayload(await form.validateFields()));
      message.success('Configuration saved');
    } finally {
      setSaving(false);
    }
  };

  const content = useMemo(() => {
    if (area === 'accounting') {
      return (
        <Row gutter={12}>
          {accountField('default_cash_account_id', 'Default Cash Account', accounts)}
          {accountField('default_bank_account_id', 'Default Bank Account', accounts)}
          {accountField('accounts_receivable_id', 'Accounts Receivable', accounts)}
          {accountField('accounts_payable_id', 'Accounts Payable', accounts)}
          {accountField('sales_account_id', 'Sales Account', accounts)}
          {accountField('purchase_account_id', 'Purchase Account', accounts)}
          {accountField('sales_return_account_id', 'Sales Return Account', accounts)}
          {accountField('purchase_return_account_id', 'Purchase Return Account', accounts)}
          {accountField('tax_payable_account_id', 'Tax Payable Account', accounts)}
          {accountField('tax_receivable_account_id', 'Tax Receivable Account', accounts)}
          {accountField('payroll_expense_account_id', 'Payroll Expense Account', accounts)}
          {accountField('inventory_account_id', 'Inventory Account', accounts)}
        </Row>
      );
    }

    if (area === 'hrm') {
      return (
        <Row gutter={12}>
          <Col xs={24} md={6}><Form.Item name="default_working_hours_per_day" label="Hours / Day"><InputNumber min={1} max={24} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="default_working_days_per_week" label="Days / Week"><InputNumber min={1} max={7} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="attendance_grace_period_minutes" label="Grace Minutes"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="half_day_threshold_hours" label="Half Day Hours"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="leave_year_start_month" label="Leave Year Month"><InputNumber min={1} max={12} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="payroll_day" label="Payroll Day"><InputNumber min={1} max={31} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="probation_period_days" label="Probation Days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="overtime_rate_multiplier" label="Overtime Rate"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="weekend_days" label="Weekend Days"><Select mode="multiple" options={['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((value) => ({ value }))} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="overtime_enabled" label="Overtime" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="attendance_correction_enabled" label="Attendance Correction" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="require_leave_approval" label="Leave Approval" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="require_attendance_approval" label="Attendance Approval" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
      );
    }

    if (area === 'inventory') {
      return (
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="default_warehouse_id" label="Default Warehouse"><Select allowClear options={warehouses} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="stock_valuation_method" label="Valuation Method"><Select options={['FIFO', 'LIFO', 'WEIGHTED_AVERAGE'].map((value) => ({ value }))} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="default_low_stock_threshold" label="Low Stock Threshold"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="product_code_prefix" label="Product Code Prefix"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="negative_stock_allowed" label="Allow Negative Stock" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="low_stock_alert_enabled" label="Low Stock Alerts" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="auto_generate_product_code" label="Auto Product Codes" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
      );
    }

    if (area === 'sales') {
      return (
        <Row gutter={12}>
          <Col xs={24} md={8}><Form.Item name="default_customer_account_id" label="Default Customer Account"><Select allowClear options={accounts} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="default_sales_tax_id" label="Default Sales Tax"><Select allowClear options={taxes} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="quotation_validity_days" label="Quotation Validity Days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="invoice_due_days" label="Invoice Due Days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="require_sales_order_approval" label="Sales Order Approval" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="allow_negative_receivable" label="Allow Negative Receivable" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="overdue_reminders_enabled" label="Overdue Reminders" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>
      );
    }

    return (
      <Row gutter={12}>
        <Col xs={24} md={8}><Form.Item name="default_supplier_account_id" label="Default Supplier Account"><Select allowClear options={accounts} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="default_purchase_tax_id" label="Default Purchase Tax"><Select allowClear options={taxes} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="bill_due_days" label="Bill Due Days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="require_purchase_order_approval" label="Purchase Order Approval" valuePropName="checked"><Switch /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="require_bill_approval" label="Bill Approval" valuePropName="checked"><Switch /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="overdue_reminders_enabled" label="Overdue Reminders" valuePropName="checked"><Switch /></Form.Item></Col>
      </Row>
    );
  }, [accounts, area, taxes, warehouses]);

  return (
    <>
      <Head title={titles[area] || 'Configuration'} />
      <div style={{ padding: 18 }}>
        <Card title={titles[area] || 'Configuration'} extra={<Button type="primary" loading={saving} onClick={save}>Save</Button>} style={{ borderRadius: 8 }}>
          <Form form={form} layout="vertical">
            {content}
          </Form>
        </Card>
      </div>
    </>
  );
}
