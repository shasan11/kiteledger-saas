import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert } from 'antd';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import TransactionLineItems from '@/Components/Transactions/TransactionLineItems.jsx';
import TransactionTotals from '@/Components/Transactions/TransactionTotals.jsx';
import ReferenceAutocomplete from '@/Components/Transactions/ReferenceAutocomplete.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { calculateTotals, normalizeLine, toNumber, asId, nullIfEmpty, formatDate, toDayjs, currencySymbolOf } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyLine = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', description: '', qty: 1, unit_price: 0, discount_percent: 0, tax_rate_id: null, tax_jurisdiction_id: null, tax_amount: 0, line_total: 0 });
const mapLines = (lines = []) => (lines || []).map((l) => ({
  _key: newKey(), ...(l.id ? { id: l.id } : {}),
  product_id: l.product_id ?? l.product?.id ?? null, product_detail: l.product || l.product_id_detail || null,
  product_name: l.product_name || l.product?.name || '', description: l.description || '',
  qty: toNumber(l.qty) || 0, unit_price: toNumber(l.unit_price), discount_percent: toNumber(l.discount_percent),
  tax_rate_id: l.tax_rate_id_detail || l.tax_rate || (l.tax_rate_id ? { id: l.tax_rate_id } : null),
  tax_jurisdiction_id: l.tax_jurisdiction_id ?? null, tax_amount: toNumber(l.tax_amount), line_total: toNumber(l.line_total),
}));

export default function DebitNoteAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [topError, setTopError] = useState(null);
  const [purchaseBillId, setPurchaseBillId] = useState(null);
  const [currencyDetail, setCurrencyDetail] = useState(null);
  const currencySymbol = currencySymbolOf(currencyDetail);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'debit_note_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        debit_note_no: docNumber,
        debit_note_date: toDayjs(initialRecord.debit_note_date) || dayjs(),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
      });
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      if (lines.length) setItems(mapLines(lines));
      setPurchaseBillId(initialRecord.purchase_bill_id || null);
      setCurrencyDetail(initialRecord.currency || initialRecord.currency_id_detail || null);
    } else {
      form.setFieldsValue({ debit_note_no: '#DRAFT', debit_note_date: dayjs(), exchange_rate: 1 });
    }
  }, [initialRecord]);

  const onPickPB = (rec) => {
    if (!rec) return;
    form.setFieldsValue({
      contact_id: rec.contact_id ?? rec.contact?.id ?? null,
      warehouse_id: rec.warehouse_id ?? rec.warehouse?.id ?? form.getFieldValue('warehouse_id') ?? null,
      currency_id: rec.currency_id ?? rec.currency?.id ?? null,
      exchange_rate: toNumber(rec.exchange_rate) || 1,
    });
    setPurchaseBillId(rec.id);
    setItems(mapLines(rec.items || []));
  };

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    if (!items.length || items.every((l) => !asId(l.product_id) && !(l.product_name || '').trim())) { setTopError('At least one line is required.'); return; }
    const normalized = items.map((l) => normalizeLine(l)).filter((l) => !!asId(l.product_id) || !!(l.product_name || '').trim());
    const totals = calculateTotals(items);
    const payload = {
      debit_note_no: null,
      debit_note_date: formatDate(v.debit_note_date),
      contact_id: asId(v.contact_id),
      warehouse_id: asId(v.warehouse_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      purchase_bill_id: purchaseBillId || null,
      total: totals.grand_total, sub_total: totals.subtotal, discount_total: totals.discount_total, tax_total: totals.tax_total,
      items: normalized, deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/debit-notes/${recordId}/`, payload) : await postJson('/api/debit-notes/', payload);
      message.success(isEdit ? 'Debit note updated' : 'Debit note created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-out.debit-notes.show', id));
      else router.visit(route('payment-out.debit-notes.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Debit Note' : 'New Debit Note'} headTitle={isEdit ? 'Edit Debit Note' : 'New Debit Note'}
      onBack={() => router.visit(route('payment-out.debit-notes.index'))} onCancel={() => router.visit(route('payment-out.debit-notes.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update Debit Note' : 'Save Debit Note'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Debit note details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Supplier" name="contact_id" rules={[{ required: true, message: 'Supplier is required' }]}>
                <BackendSelect fkUrl="/api/contacts/?type=supplier" placeholder="Select supplier" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}><Form.Item label="Debit Note No" name="debit_note_no"><Input disabled /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Date" name="debit_note_date" rules={[{ required: true, message: 'Date is required' }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Warehouse" name="warehouse_id"><BackendSelect fkUrl="/api/warehouses/" placeholder="Warehouse" allowClear /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Currency" name="currency_id"><BackendSelect fkUrl="/api/currencies/" placeholder="Currency" labelFn={(r) => r?.name || r?.code || ''} allowClear onChange={(v, raw) => { form.setFieldValue('currency_id', v); setCurrencyDetail(raw); }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Exchange Rate" name="exchange_rate" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24}>
              <Form.Item label="Reference (search Purchase Bills)" name="reference">
                <ReferenceAutocomplete
                  sources={[{ key: 'purchase_bill', label: 'Purchase Bill', url: '/api/purchase-bills/', searchParam: 'search', numberField: 'bill_no', contactField: 'contact', dateField: 'bill_date', totalField: 'total' }]}
                  onPick={onPickPB} placeholder="Type to search purchase bills"
                />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>
        <FormSection title="Line items">
          <TransactionLineItems items={items} onChange={setItems} onDeleteExistingId={(id) => setDeletedItemIds((p) => [...p, id])} productSearchUrl="/api/products/search?transaction=purchase" priceField="purchase_price" currencySymbol={currencySymbol} />
        </FormSection>
        <FormSection title=""><TransactionTotals items={items} currencySymbol={currencySymbol} /></FormSection>
        <FormSection title="Reason / Notes"><Form.Item name="notes"><Input.TextArea rows={3} placeholder="Reason for debit note" /></Form.Item></FormSection>
      </Form>
    </TransactionFormShell>
  );
}
