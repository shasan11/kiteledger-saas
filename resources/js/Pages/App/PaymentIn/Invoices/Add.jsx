import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert } from 'antd';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import QuickAddRemoteSelect from '@/Components/QuickAddRemoteSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import ReferenceAutocomplete from '@/Components/Transactions/ReferenceAutocomplete.jsx';
import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });
const customerQuickAddFields = [
  { name: 'name', label: 'Customer Name', placeholder: 'Customer name', rules: [{ required: true, message: 'Customer name is required' }] },
  { name: 'code', label: 'Code', placeholder: 'Auto-generate if blank', col: 12 },
  { name: 'phone', label: 'Phone', type: 'phone', placeholder: '9800000000', col: 12, defaultCountryCode: '+977' },
  { name: 'email', label: 'Email', placeholder: 'email@example.com', col: 12 },
  { name: 'address', label: 'Address', type: 'textarea', rows: 2, placeholder: 'Address' },
];
const customerQuickAddInitialValues = { contact_type: 'customer', name: '', code: '', phone: '', email: '', address: '', active: true };
const customerLabel = (row) => [row?.name, row?.code ? `(${row.code})` : null].filter(Boolean).join(' ');
const trimOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};
const customerCreatePayload = (values = {}) => ({
  contact_type: 'customer',
  name: trimOrNull(values.name),
  code: trimOrNull(values.code),
  phone: trimOrNull(values.phone),
  email: trimOrNull(values.email),
  address: trimOrNull(values.address),
  active: true,
});

const mapLines = (lines = [], options = {}) => (lines || []).map((l) => ({
  _key: newKey(),
  ...(options.keepIds && l.id ? { id: l.id } : {}),
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

export default function InvoiceAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [sourceIds, setSourceIds] = useState({ quotation_id: null, sales_order_id: null });
  const [reportingTags, setReportingTags] = useState({});
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const defaultCurrency = useDefaultCurrency(true);
  const baseCurrency = useBaseCurrency(true);
  const currencySymbol = currencySymbolOf(currencyDetail);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'invoice_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        invoice_no: docNumber,
        invoice_date: toDayjs(initialRecord.invoice_date) || dayjs(),
        due_date: toDayjs(initialRecord.due_date),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        credit_term_id: initialRecord.credit_term_id ?? initialRecord.credit_term?.id ?? null,
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      if (lines.length) setItems(mapLines(lines, { keepIds: true }));
      setSourceIds({ quotation_id: initialRecord.quotation_id || null, sales_order_id: initialRecord.sales_order_id || null });
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
      setReportingTags(reportingTagsToMap(initialRecord));
    } else {
      try {
        const raw = sessionStorage.getItem('kiteledger_invoice_prefill') || sessionStorage.getItem('invoice_prefill');
        if (raw) {
          const p = JSON.parse(raw);
          form.setFieldsValue({
            invoice_no: '#DRAFT',
            invoice_date: dayjs(),
            due_date: toDayjs(p.due_date),
            exchange_rate: toNumber(p.exchange_rate) || 1,
            contact_id: p.contact_id || null,
            warehouse_id: p.warehouse_id || null,
            credit_term_id: p.credit_term_id || null,
            reference: p.reference || '',
            currency_id: p.currency_id || null,
          });
          setSourceIds({
            quotation_id: p._source === 'quotation' ? p._source_id || null : p.quotation_id || null,
            sales_order_id: p._source === 'sales_order' ? p._source_id || null : p.sales_order_id || null,
          });
          setCurrencyDetail(p.currency_id_detail || null);
          if (Array.isArray(p.items) && p.items.length) setItems(mapLines(p.items, { keepIds: false }));
          sessionStorage.removeItem('kiteledger_invoice_prefill');
          sessionStorage.removeItem('invoice_prefill');
          return;
        }
      } catch {}
      form.setFieldsValue({
        invoice_no: '#DRAFT',
        invoice_date: dayjs(),
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

  const onPickReference = (rec, source) => {
    if (!rec) return;
    form.setFieldsValue({
      contact_id: rec.contact_id ?? rec.contact?.id ?? null,
      warehouse_id: rec.warehouse_id ?? rec.warehouse?.id ?? form.getFieldValue('warehouse_id') ?? null,
      credit_term_id: rec.credit_term_id ?? rec.credit_term?.id ?? form.getFieldValue('credit_term_id') ?? null,
      currency_id: rec.currency_id ?? rec.currency?.id ?? null,
      exchange_rate: toNumber(rec.exchange_rate) || 1,
    });
    setItems(mapLines(rec.items || [], { keepIds: false }));
    setSourceIds({
      quotation_id: source.key === 'quotation' ? rec.id : (rec.quotation_id || null),
      sales_order_id: source.key === 'sales_order' ? rec.id : null,
    });
  };

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    if (!items.length || items.every((l) => !asId(l.product_id) && !(l.product_name || '').trim())) {
      setTopError('At least one line is required.');
      return;
    }
    const normalized = items.map((l) => normalizeLine(l)).filter((l) => !!asId(l.product_id) || !!(l.product_name || '').trim());
    const totals = calculateTotals(items);
    const payload = {
      invoice_no: null,
      invoice_date: formatDate(v.invoice_date),
      due_date: formatDate(v.due_date),
      contact_id: asId(v.contact_id),
      warehouse_id: asId(v.warehouse_id),
      credit_term_id: asId(v.credit_term_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      quotation_id: sourceIds.quotation_id || null,
      sales_order_id: sourceIds.sales_order_id || null,
      total: totals.grand_total,
      sub_total: totals.subtotal,
      discount_total: totals.discount_total,
      tax_total: totals.tax_total,
      items: normalized,
      deleted_item_ids: deletedItemIds,
      reporting_tags: mapToReportingTagsPayload(reportingTags),
    };
    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/invoices/${recordId}/`, payload)
        : await postJson('/api/invoices/', payload);
      message.success(isEdit ? 'Invoice updated' : 'Invoice created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-in.invoices.show', id));
      else router.visit(route('payment-in.invoices.index'));
    } catch (e) {
      setTopError(applyServerErrors(e, form));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TransactionFormShell
      auth={props.auth}
      title={isEdit ? 'Edit Invoice' : 'New Invoice'}
      headTitle={isEdit ? 'Edit Invoice' : 'New Invoice'}
      onBack={() => router.visit(route('payment-in.invoices.index'))}
      onCancel={() => router.visit(route('payment-in.invoices.index'))}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Update Invoice' : 'Save Invoice'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Invoice details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <QuickAddRemoteSelect
                name="contact_id"
                label="Customer"
                required
                apiUrl="/api/contacts/"
                params={{ contact_type: 'customer' }}
                placeholder="Select customer"
                labelBuilder={customerLabel}
                quickAddTitle="Customer"
                quickAddFields={customerQuickAddFields}
                quickAddInitialValues={customerQuickAddInitialValues}
                createPayload={customerCreatePayload}
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Invoice No" name="invoice_no"><Input disabled /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Invoice Date" name="invoice_date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Due Date" name="due_date"><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Warehouse" name="warehouse_id">
                <BackendSelect fkUrl="/api/warehouses/" placeholder="Warehouse" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Credit Terms" name="credit_term_id">
                <BackendSelect fkUrl="/api/credit-terms/" placeholder="Credit terms" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Currency" name="currency_id">
                <BackendSelect fkUrl="/api/currencies/" placeholder="Currency" labelFn={(r) => r?.name || r?.code || ''} allowClear onChange={(v, raw) => { form.setFieldValue('currency_id', v); setCurrencyDetail(raw); }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label={exchangeRateLabel(baseCurrency)} name="exchange_rate" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} step={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Reference (search Sales Orders & Quotations)" name="reference">
                <ReferenceAutocomplete
                  sources={[
                    { key: 'sales_order', label: 'Sales Order', url: '/api/sales-orders/', searchParam: 'search', numberField: 'sales_order_no', contactField: 'contact', dateField: 'sales_order_date', totalField: 'total' },
                    { key: 'quotation', label: 'Quotation', url: '/api/quotations/', searchParam: 'search', numberField: 'quotation_no', contactField: 'contact', dateField: 'quotation_date', totalField: 'total' },
                  ]}
                  onPick={onPickReference}
                  placeholder="Type to search sales orders or quotations"
                />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        <FormSection title="Line items">
          <TransactionLineItems
            items={items}
            onChange={setItems}
            onDeleteExistingId={(id) => setDeletedItemIds((p) => [...p, id])}
            productSearchUrl="/api/products/search?transaction=sale"
            priceField="selling_price"
            currencySymbol={currencySymbol}
          />
        </FormSection>

        <FormSection title=""><TransactionTotals items={items} currencySymbol={currencySymbol} /></FormSection>

        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>

        <FormSection title="">
          <ReportingTagsPanel value={reportingTags} onChange={setReportingTags} />
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
