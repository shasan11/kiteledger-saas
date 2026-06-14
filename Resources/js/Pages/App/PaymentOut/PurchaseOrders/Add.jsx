import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert } from 'antd';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });
const mapLines = (lines = []) => (lines || []).map((l) => ({
  _key: newKey(),
  ...(l.id ? { id: l.id } : {}),
  product_id: l.product_id ?? l.product?.id ?? null,
  product_detail: l.product || l.product_id_detail || null,
  product_name: l.product_name || l.product?.name || '',
  description: l.description || '',
  qty: toNumber(l.qty) || 0,
  unit_price: toNumber(l.unit_price),
  discount_percent: toNumber(l.discount_percent),
  tax_rate_id: l.tax_rate_id_detail || l.tax_rate || (l.tax_rate_id ? { id: l.tax_rate_id } : null),
  tax_jurisdiction_id: l.tax_jurisdiction_id ?? null,
  tax_amount: toNumber(l.tax_amount),
  line_total: toNumber(l.line_total),
}));

import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';

export default function PurchaseOrderAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [reportingTags, setReportingTags] = useState(() => reportingTagsToMap(initialRecord));
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const defaultCurrency = useDefaultCurrency(true);
  const baseCurrency = useBaseCurrency(true);
  const currencySymbol = currencySymbolOf(currencyDetail);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'purchase_order_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        purchase_order_no: docNumber,
        purchase_order_date: toDayjs(initialRecord.purchase_order_date) || dayjs(),
        due_date: toDayjs(initialRecord.due_date),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      if (lines.length) setItems(mapLines(lines));
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
    } else {
      form.setFieldsValue({
        purchase_order_no: '#DRAFT',
        purchase_order_date: dayjs(),
        exchange_rate: 1,
        currency_id: defaultCurrency?.id ?? null,
      });
      if (defaultCurrency?.id) {
        setCurrencyDetail(defaultCurrency);
      }
    }
  }, [initialRecord]);

  useEffect(() => {
    if (!initialRecord) applyDefaultCurrency(form, defaultCurrency, setCurrencyDetail);
  }, [defaultCurrency, form, initialRecord]);

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    if (!items.length || items.every((l) => !asId(l.product_id) && !(l.product_name || '').trim())) {
      setTopError('At least one line is required.'); return;
    }
    const normalized = items.map((l) => normalizeLine(l)).filter((l) => !!asId(l.product_id) || !!(l.product_name || '').trim());
    const totals = calculateTotals(items);
    const payload = {
      reporting_tags: mapToReportingTagsPayload(reportingTags),
      purchase_order_no: null,
      purchase_order_date: formatDate(v.purchase_order_date),
      due_date: formatDate(v.due_date),
      contact_id: asId(v.contact_id),
      warehouse_id: asId(v.warehouse_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      total: totals.grand_total,
      sub_total: totals.subtotal,
      discount_total: totals.discount_total,
      tax_total: totals.tax_total,
      items: normalized,
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/purchase-orders/${recordId}/`, payload) : await postJson('/api/purchase-orders/', payload);
      message.success(isEdit ? 'Purchase order updated' : 'Purchase order created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-out.purchase-orders.show', id));
      else router.visit(route('payment-out.purchase-orders.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'} headTitle={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
      onBack={() => router.visit(route('payment-out.purchase-orders.index'))}
      onCancel={() => router.visit(route('payment-out.purchase-orders.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update Purchase Order' : 'Save Purchase Order'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Purchase order details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Supplier" name="contact_id" rules={[{ required: true, message: 'Supplier is required' }]}>
                <BackendSelect fkUrl="/api/contacts/" extraParams={{ contact_type: 'supplier', accept_purchase: true }} placeholder="Select supplier" quickAddContact quickAddContactTitle="Supplier" quickAddContactDefaults={{ contact_type: 'supplier', accept_purchase: true }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="PO No" name="purchase_order_no"><Input disabled /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="PO Date" name="purchase_order_date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Expected Date" name="due_date"><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Warehouse" name="warehouse_id"><BackendSelect fkUrl="/api/warehouses/" placeholder="Warehouse" allowClear /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Currency" name="currency_id"><BackendSelect fkUrl="/api/currencies/" placeholder="Currency" labelFn={(r) => r?.name || r?.code || ''} allowClear onChange={(v, raw) => { form.setFieldValue('currency_id', v); setCurrencyDetail(raw); }} /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label={exchangeRateLabel(baseCurrency)} name="exchange_rate" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} step={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Reference" name="reference"><Input placeholder="Reference" /></Form.Item>
            </Col>
          </Row>
        </FormSection>
        <FormSection title="Line items">
          <TransactionLineItems items={items} onChange={setItems} onDeleteExistingId={(id) => setDeletedItemIds((p) => [...p, id])} productSearchUrl="/api/products/search?transaction=purchase" priceField="purchase_price" currencySymbol={currencySymbol} />
        </FormSection>
        <FormSection title=""><TransactionTotals items={items} currencySymbol={currencySymbol} /></FormSection>
        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>
        <div style={{ marginTop: 16 }}>
          <ReportingTagsPanel value={reportingTags} onChange={setReportingTags} />
        </div>
      </Form>
    </TransactionFormShell>
  );
}
