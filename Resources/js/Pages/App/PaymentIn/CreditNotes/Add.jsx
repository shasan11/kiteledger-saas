import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, Switch, message, Alert } from 'antd';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import ReferenceAutocomplete from '@/Components/Transactions/ReferenceAutocomplete.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });
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

export default function CreditNoteAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const [hasRefund, setHasRefund] = useState(false);
  const [refundAmountTouched, setRefundAmountTouched] = useState(false);
  const defaultCurrency = useDefaultCurrency(true);
  const baseCurrency = useBaseCurrency(true);
  const currencySymbol = currencySymbolOf(currencyDetail);

  // Backend uses sales_return_no / sales_return_date; preserve that.
  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, initialRecord.credit_note_no ? 'credit_note_no' : 'sales_return_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        credit_note_no: docNumber,
        credit_note_date: toDayjs(initialRecord.sales_return_date || initialRecord.credit_note_date) || dayjs(),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || initialRecord.reason || '',
        remarks: initialRecord.remarks || '',
        has_refund: !!initialRecord.has_refund,
        refund_account_id: initialRecord.refund_account_id ?? initialRecord.refundAccount?.id ?? null,
        refund_reference: initialRecord.refund_reference || '',
        refund_amount: toNumber(initialRecord.refund_amount) || 0,
      });
      setHasRefund(!!initialRecord.has_refund);
      setRefundAmountTouched(!!initialRecord.has_refund && toNumber(initialRecord.refund_amount) > 0);
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      if (lines.length) setItems(mapLines(lines, { keepIds: true }));
      setInvoiceId(initialRecord.invoice_id || null);
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
    } else {
      form.setFieldsValue({
        credit_note_no: '#DRAFT',
        credit_note_date: dayjs(),
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

  const totals = calculateTotals(items);

  useEffect(() => {
    if (!hasRefund) return;
    if (refundAmountTouched) return;
    form.setFieldValue('refund_amount', totals.grand_total || 0);
  }, [hasRefund, refundAmountTouched, totals.grand_total, form]);

  const onToggleRefund = (checked) => {
    setHasRefund(checked);
    form.setFieldValue('has_refund', checked);
    if (checked) {
      setRefundAmountTouched(false);
      form.setFieldValue('refund_amount', totals.grand_total || 0);
    } else {
      form.setFieldsValue({ refund_account_id: null, refund_reference: '', refund_amount: 0 });
      setRefundAmountTouched(false);
    }
  };

  const onPickInvoice = (rec) => {
    if (!rec) return;
    form.setFieldsValue({
      contact_id: rec.contact_id ?? rec.contact?.id ?? null,
      currency_id: rec.currency_id ?? rec.currency?.id ?? null,
      exchange_rate: toNumber(rec.exchange_rate) || 1,
    });
    setInvoiceId(rec.id);
    setItems(mapLines(rec.items || [], { keepIds: false }));
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
    const submitTotals = calculateTotals(items);
    if (hasRefund) {
      const refundAmt = toNumber(v.refund_amount);
      if (!refundAmt || refundAmt <= 0) {
        setTopError('Refund amount must be greater than 0.');
        return;
      }
      if (refundAmt > Number(submitTotals.grand_total || 0) + 0.001) {
        setTopError('Refund amount cannot exceed the credit note total.');
        return;
      }
    }
    const payload = {
      sales_return_no: null,
      sales_return_date: formatDate(v.credit_note_date),
      contact_id: asId(v.contact_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      invoice_id: invoiceId || null,
      total: submitTotals.grand_total,
      sub_total: submitTotals.subtotal,
      discount_total: submitTotals.discount_total,
      tax_total: submitTotals.tax_total,
      has_refund: !!hasRefund,
      refund_account_id: hasRefund ? asId(v.refund_account_id) : null,
      refund_reference: hasRefund ? nullIfEmpty(v.refund_reference) : null,
      refund_amount: hasRefund ? toNumber(v.refund_amount) : null,
      items: normalized,
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/credit-notes/${recordId}/`, payload)
        : await postJson('/api/credit-notes/', payload);
      message.success(isEdit ? 'Credit note updated' : 'Credit note created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-in.credit-notes.show', id));
      else router.visit(route('payment-in.credit-notes.index'));
    } catch (e) {
      setTopError(applyServerErrors(e, form));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TransactionFormShell
      auth={props.auth}
      title={isEdit ? 'Edit Credit Note' : 'New Credit Note'}
      headTitle={isEdit ? 'Edit Credit Note' : 'New Credit Note'}
      onBack={() => router.visit(route('payment-in.credit-notes.index'))}
      onCancel={() => router.visit(route('payment-in.credit-notes.index'))}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Update Credit Note' : 'Save Credit Note'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Credit note details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Customer" name="contact_id" rules={[{ required: true, message: 'Customer is required' }]}>
                <BackendSelect fkUrl="/api/contacts/" extraParams={{ contact_type: 'customer' }} placeholder="Select customer" quickAddContact quickAddContactTitle="Customer" quickAddContactDefaults={{ contact_type: 'customer' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Credit Note No" name="credit_note_no"><Input disabled /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Credit Note Date" name="credit_note_date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
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
            <Col xs={24}>
              <Form.Item label="Reference (search Invoices)" name="reference">
                <ReferenceAutocomplete
                  sources={[{ key: 'invoice', label: 'Invoice', url: '/api/invoices/', searchParam: 'search', numberField: 'invoice_no', contactField: 'contact', dateField: 'invoice_date', totalField: 'total' }]}
                  onPick={onPickInvoice}
                  placeholder="Type to search invoices"
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

        <FormSection title="Refund">
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Refund" name="has_refund" valuePropName="checked" tooltip="Enable to create a refund entry alongside the credit note">
                <Switch checked={hasRefund} onChange={onToggleRefund} />
              </Form.Item>
            </Col>
            {hasRefund && (
              <>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Refund Account" name="refund_account_id" rules={[{ required: true, message: 'Refund account is required' }]}>
                    <BackendSelect fkUrl="/api/accounts/?active=true" placeholder="Select refund account" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Refund Reference" name="refund_reference">
                    <Input placeholder="Reference" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Refund Amount" name="refund_amount" rules={[{ required: true, message: 'Refund amount is required' }]}>
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                      onChange={() => setRefundAmountTouched(true)}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </FormSection>

        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
