import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert } from 'antd';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import { api, postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber, isApproved } from '@/Components/Transactions/documentNumber.js';
import { applyDefaultCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });

export default function QuotationAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const defaultCurrency = useDefaultCurrency(!isEdit && !initialRecord);
  const currencySymbol = currencySymbolOf(currencyDetail);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'quotation_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        quotation_no: docNumber,
        quotation_date: toDayjs(initialRecord.quotation_date) || dayjs(),
        expiry_date: toDayjs(initialRecord.expiry_date),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        credit_term_id: initialRecord.credit_term_id ?? initialRecord.credit_term?.id ?? null,
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      if (lines.length) {
        setItems(lines.map((l) => ({
          _key: newKey(),
          id: l.id,
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
        })));
      }
    } else {
      form.setFieldsValue({
        quotation_no: '#DRAFT',
        quotation_date: dayjs(),
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

  const validateLines = () => {
    if (!items.length) return 'At least one line is required.';
    for (const l of items) {
      if (!asId(l.product_id) && !(l.product_name || '').trim()) return 'Every line must have a product.';
      if (toNumber(l.qty) <= 0) return 'Every line must have qty > 0.';
    }
    return null;
  };

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const err = validateLines();
    if (err) { setTopError(err); return; }

    const normalized = items.map((l) => normalizeLine({ ...l, tax_rate_id: l.tax_rate_id })).filter((l) => !!asId(l.product_id) || !!(l.product_name || '').trim());
    const totals = calculateTotals(items);

    const payload = {
      quotation_no: null,
      quotation_date: formatDate(v.quotation_date),
      expiry_date: formatDate(v.expiry_date),
      contact_id: asId(v.contact_id),
      credit_term_id: asId(v.credit_term_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      total: totals.grand_total,
      sub_total: totals.subtotal,
      discount_total: totals.discount_total,
      tax_total: totals.tax_total,
      taxable_total: totals.taxable_total,
      non_taxable_total: totals.non_taxable_total,
      items: normalized,
      deleted_item_ids: deletedItemIds,
    };

    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/quotations/${recordId}/`, payload)
        : await postJson('/api/quotations/', payload);
      message.success(isEdit ? 'Quotation updated' : 'Quotation created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-in.quotations.show', id));
      else router.visit(route('payment-in.quotations.index'));
    } catch (e) {
      setTopError(applyServerErrors(e, form));
    } finally {
      setSubmitting(false);
    }
  };

  const removeExistingRow = (id) => setDeletedItemIds((p) => [...p, id]);

  return (
    <TransactionFormShell
      auth={props.auth}
      title={isEdit ? 'Edit Quotation' : 'New Quotation'}
      headTitle={isEdit ? 'Edit Quotation' : 'New Quotation'}
      onBack={() => router.visit(route('payment-in.quotations.index'))}
      onCancel={() => router.visit(route('payment-in.quotations.index'))}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Update Quotation' : 'Save Quotation'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Quotation details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Customer" name="contact_id" rules={[{ required: true, message: 'Customer is required' }]}>
                <BackendSelect fkUrl="/api/contacts/" placeholder="Select customer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Quotation No" name="quotation_no">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Quotation Date" name="quotation_date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Valid Until" name="expiry_date">
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
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
              <Form.Item label="Exchange Rate" name="exchange_rate" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0} step={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        <FormSection title="Line items">
          <TransactionLineItems
            items={items}
            onChange={setItems}
            onDeleteExistingId={removeExistingRow}
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
