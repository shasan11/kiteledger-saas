import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert } from 'antd';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import ReferenceAutocomplete from '@/Components/Transactions/ReferenceAutocomplete.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, getTaxJurisdictionId, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { applyDefaultCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });

const mapRefLines = (lines = []) => (lines || []).map((l) => ({
  _key: newKey(),
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

export default function SalesOrderAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [sourceQuotationId, setSourceQuotationId] = useState(null);
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const defaultCurrency = useDefaultCurrency(!isEdit && !initialRecord);
  const currencySymbol = currencySymbolOf(currencyDetail);
  const { defaultCurrency } = usePage().props;

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'sales_order_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        sales_order_no: docNumber,
        sales_order_date: toDayjs(initialRecord.sales_order_date) || dayjs(),
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
      if (lines.length) {
        setItems(lines.map((l) => ({ ...mapRefLines([l])[0], id: l.id })));
      }
      if (initialRecord.quotation_id) setSourceQuotationId(initialRecord.quotation_id);
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
    } else {
      form.setFieldsValue({
        sales_order_no: '#DRAFT',
        sales_order_date: dayjs(),
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

  const onPickQuotation = (rec) => {
    if (!rec) return;
    form.setFieldsValue({
      contact_id: rec.contact_id ?? rec.contact?.id ?? null,
      currency_id: rec.currency_id ?? rec.currency?.id ?? null,
      exchange_rate: toNumber(rec.exchange_rate) || 1,
      credit_term_id: rec.credit_term_id ?? rec.credit_term?.id ?? null,
      notes: rec.notes || form.getFieldValue('notes') || '',
    });
    setSourceQuotationId(rec.id);
    setItems(mapRefLines(rec.items || []));
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
      sales_order_no: null,
      sales_order_date: formatDate(v.sales_order_date),
      due_date: formatDate(v.due_date),
      contact_id: asId(v.contact_id),
      warehouse_id: asId(v.warehouse_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      quotation_id: sourceQuotationId || null,
      total: totals.grand_total,
      sub_total: totals.subtotal,
      discount_total: totals.discount_total,
      tax_total: totals.tax_total,
      items: normalized,
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/sales-orders/${recordId}/`, payload)
        : await postJson('/api/sales-orders/', payload);
      message.success(isEdit ? 'Sales Order updated' : 'Sales Order created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-in.sales-orders.show', id));
      else router.visit(route('payment-in.sales-orders.index'));
    } catch (e) {
      setTopError(applyServerErrors(e, form));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TransactionFormShell
      auth={props.auth}
      title={isEdit ? 'Edit Sales Order' : 'New Sales Order'}
      headTitle={isEdit ? 'Edit Sales Order' : 'New Sales Order'}
      onBack={() => router.visit(route('payment-in.sales-orders.index'))}
      onCancel={() => router.visit(route('payment-in.sales-orders.index'))}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Update Sales Order' : 'Save Sales Order'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Sales order details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Customer" name="contact_id" rules={[{ required: true, message: 'Customer is required' }]}>
                <BackendSelect fkUrl="/api/contacts/" placeholder="Select customer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Sales Order No" name="sales_order_no">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Order Date" name="sales_order_date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Delivery Date" name="due_date">
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Warehouse" name="warehouse_id">
                <BackendSelect fkUrl="/api/warehouses/" placeholder="Warehouse" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Currency" name="currency_id">
                <BackendSelect fkUrl="/api/currencies/" placeholder="Currency" labelFn={(r) => r?.name || r?.code || ''} allowClear onChange={(v, raw) => { form.setFieldValue('currency_id', v); setCurrencyDetail(raw); }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Exchange Rate" name="exchange_rate" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} step={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Reference (search Quotations)" name="reference">
                <ReferenceAutocomplete
                  sources={[{
                    key: 'quotation',
                    label: 'Quotation',
                    url: '/api/quotations/',
                    searchParam: 'search',
                    numberField: 'quotation_no',
                    contactField: 'contact',
                    dateField: 'quotation_date',
                    totalField: 'total',
                  }]}
                  onPick={onPickQuotation}
                  placeholder="Type to search quotations or enter reference manually"
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

        <FormSection title="">
          <TransactionTotals items={items} currencySymbol={currencySymbol} />
        </FormSection>

        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
