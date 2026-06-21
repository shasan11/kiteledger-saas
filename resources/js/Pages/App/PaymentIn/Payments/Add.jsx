import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Select, Row, Col, message, Alert, Table, Button, Switch, Space, Typography } from 'antd';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs, money } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { applyDefaultCurrency, exchangeRateLabel, useBaseCurrency, useDefaultCurrency } from '@/Components/Transactions/defaultCurrency.js';

const { Text } = Typography;
const newKey = () => Math.random().toString(36).slice(2);

import ReportingTagsPanel, { reportingTagsToMap, mapToReportingTagsPayload } from '@/Components/ReportingTagsPanel.jsx';

export default function PaymentInAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [reportingTags, setReportingTags] = useState(() => reportingTagsToMap(initialRecord));
  const [submitting, setSubmitting] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [bankApplicable, setBankApplicable] = useState(false);
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [topError, setTopError] = useState(null);
  const [contactId, setContactId] = useState(null);
  const defaultCurrency = useDefaultCurrency(true);
  const baseCurrency = useBaseCurrency(true);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'payment_no') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        payment_no: docNumber,
        payment_date: toDayjs(initialRecord.payment_date) || dayjs(),
        contact_id: initialRecord.contact_id ?? initialRecord.contact?.id ?? null,
        account_id: initialRecord.account_id ?? initialRecord.account?.id ?? null,
        payment_method: initialRecord.payment_method || 'cash',
        currency_id: initialRecord.currency_id ?? initialRecord.currency?.id ?? null,
        exchange_rate: toNumber(initialRecord.exchange_rate) || 1,
        amount: toNumber(initialRecord.amount),
        bank_charges_account_id: initialRecord.bank_charges_account_id ?? initialRecord.bank_charges_account?.id ?? null,
        bank_charges: toNumber(initialRecord.bank_charges),
        tds_charges_account_id: initialRecord.tds_charges_account_id ?? initialRecord.tds_charges_account?.id ?? null,
        tds_charges: toNumber(initialRecord.tds_charges),
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      setBankApplicable(toNumber(initialRecord.bank_charges) > 0 || !!initialRecord.bank_charges_account_id);
      setTdsApplicable(toNumber(initialRecord.tds_charges) > 0 || !!initialRecord.tds_charges_account_id);
      setContactId(initialRecord.contact_id ?? initialRecord.contact?.id ?? null);
      const lines = Array.isArray(initialRecord.items) ? initialRecord.items : [];
      setAllocations(lines.map((l) => ({
        _key: newKey(),
        id: l.id,
        invoice_id: l.invoice_id ?? l.invoice?.id ?? null,
        invoice_detail: l.invoice || null,
        allocated_amount: toNumber(l.allocated_amount),
      })));
    } else {
      try {
        const raw = sessionStorage.getItem('kiteledger_payment_prefill');
        if (raw) {
          const p = JSON.parse(raw);
          const amount = toNumber(p.amount);
          form.setFieldsValue({
            payment_no: '#DRAFT',
            payment_date: dayjs(),
            contact_id: p.contact_id || null,
            payment_method: 'cash',
            currency_id: p.currency_id || null,
            exchange_rate: toNumber(p.exchange_rate) || 1,
            amount,
            reference: p._source_no || '',
          });
          setContactId(p.contact_id || null);
          if (Array.isArray(p.items)) {
            setAllocations(p.items.map((line) => ({
              _key: newKey(),
              invoice_id: line.invoice_id ?? line.invoice?.id ?? null,
              invoice_detail: line.invoice || line.invoice_id_detail || null,
              allocated_amount: toNumber(line.allocated_amount) || amount,
            })));
          }
          sessionStorage.removeItem('kiteledger_payment_prefill');
          return;
        }
      } catch {}
      form.setFieldsValue({
        payment_no: '#DRAFT',
        payment_date: dayjs(),
        payment_method: 'cash',
        amount: 0,
        exchange_rate: 1,
        currency_id: defaultCurrency?.id ?? null,
      });
    }
  }, [initialRecord]);

  useEffect(() => {
    if (!initialRecord) applyDefaultCurrency(form, defaultCurrency);
  }, [defaultCurrency, form, initialRecord]);

  const updateAlloc = (idx, patch) => setAllocations((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addAlloc = () => setAllocations((p) => [...p, { _key: newKey(), invoice_id: null, invoice_detail: null, allocated_amount: 0 }]);
  const removeAlloc = (idx) => setAllocations((prev) => {
    const row = prev[idx];
    if (row?.id) setDeletedItemIds((ids) => [...ids, row.id]);
    return prev.filter((_, i) => i !== idx);
  });

  const totalAllocated = allocations.reduce((s, r) => s + toNumber(r.allocated_amount), 0);
  const paymentAmount = toNumber(Form.useWatch('amount', form));
  const remaining = paymentAmount - totalAllocated;

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const items = allocations.filter((l) => !!asId(l.invoice_id)).map((l) => ({ ...(l.id ? { id: l.id } : {}), invoice_id: asId(l.invoice_id), allocated_amount: toNumber(l.allocated_amount) }));
    const payload = {
      reporting_tags: mapToReportingTagsPayload(reportingTags),
      payment_no: null,
      payment_date: formatDate(v.payment_date),
      contact_id: asId(v.contact_id),
      account_id: asId(v.account_id),
      currency_id: asId(v.currency_id),
      exchange_rate: toNumber(v.exchange_rate) || 1,
      amount: toNumber(v.amount),
      payment_method: nullIfEmpty(v.payment_method),
      bank_charges_account_id: bankApplicable ? asId(v.bank_charges_account_id) : null,
      bank_charges: bankApplicable && toNumber(v.bank_charges) ? toNumber(v.bank_charges) : null,
      tds_charges_account_id: tdsApplicable ? asId(v.tds_charges_account_id) : null,
      tds_charges: tdsApplicable && toNumber(v.tds_charges) ? toNumber(v.tds_charges) : null,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      items,
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/customer-payments/${recordId}/`, payload) : await postJson('/api/customer-payments/', payload);
      message.success(isEdit ? 'Payment updated' : 'Payment created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('payment-in.payments.show', id));
      else router.visit(route('payment-in.payments.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Customer Payment' : 'New Customer Payment'} headTitle={isEdit ? 'Edit Customer Payment' : 'New Customer Payment'}
      onBack={() => router.visit(route('payment-in.payments.index'))} onCancel={() => router.visit(route('payment-in.payments.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update Payment' : 'Save Payment'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Payment details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Customer" name="contact_id" rules={[{ required: true, message: 'Customer is required' }]}>
                <BackendSelect fkUrl="/api/contacts/" extraParams={{ contact_type: 'customer' }} placeholder="Select customer" quickAddContact quickAddContactTitle="Customer" quickAddContactDefaults={{ contact_type: 'customer' }} onChange={(v) => { setContactId(v); form.setFieldValue('contact_id', v); }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}><Form.Item label="Payment No" name="payment_no"><Input disabled /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Payment Date" name="payment_date" rules={[{ required: true, message: 'Date is required' }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Payment Account" name="account_id" rules={[{ required: true, message: 'Payment account is required' }]}>
                <BackendSelect fkUrl="/api/accounts/" placeholder="Select account" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Payment Method" name="payment_method">
                <Select options={[{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'online', label: 'Online' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Currency" name="currency_id"><BackendSelect fkUrl="/api/currencies/" placeholder="Currency" labelFn={(r) => r?.name || r?.code || ''} allowClear /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label={exchangeRateLabel(baseCurrency)} name="exchange_rate" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Amount" name="amount" rules={[{ required: true, message: 'Amount required' }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Reference" name="reference"><Input placeholder="Reference" /></Form.Item></Col>
          </Row>
        </FormSection>

        <FormSection title="Bank charges & TDS">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Space><Switch checked={bankApplicable} onChange={setBankApplicable} /><Text>Bank Charges Applicable</Text></Space>
            </Col>
            <Col xs={24} sm={12}>
              <Space><Switch checked={tdsApplicable} onChange={setTdsApplicable} /><Text>TDS Applicable</Text></Space>
            </Col>
            {bankApplicable && (
              <>
                <Col xs={24} sm={12} md={8}><Form.Item label="Bank Charges Account" name="bank_charges_account_id"><BackendSelect fkUrl="/api/accounts/?active=true" placeholder="Select account" allowClear /></Form.Item></Col>
                <Col xs={24} sm={12} md={8}><Form.Item label="Bank Charges" name="bank_charges"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </>
            )}
            {tdsApplicable && (
              <>
                <Col xs={24} sm={12} md={8}><Form.Item label="TDS Account" name="tds_charges_account_id"><BackendSelect fkUrl="/api/accounts/?active=true" placeholder="Select account" allowClear /></Form.Item></Col>
                <Col xs={24} sm={12} md={8}><Form.Item label="TDS Amount" name="tds_charges"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </>
            )}
          </Row>
        </FormSection>

        <FormSection title="Invoice allocations">
          <Table
            rowKey={(r) => r._key || r.id}
            size="small" bordered pagination={false}
            dataSource={allocations}
            columns={[
              {
                title: 'Invoice', dataIndex: 'invoice_id',
                render: (val, row, idx) => (
                  <BackendSelect value={val} detailValue={row.invoice_detail} fkUrl="/api/invoices/" labelKey="invoice_no" placeholder="Select invoice"
                    extraParams={contactId ? { contact_id: contactId } : {}}
                    variant="borderless" style={{ width: '100%' }}
                    onChange={(v, raw) => {
                      const balance = toNumber(raw?.balance_due ?? raw?.total);
                      if (!toNumber(form.getFieldValue('amount')) && balance > 0) {
                        form.setFieldValue('amount', balance);
                      }
                      updateAlloc(idx, { invoice_id: v, invoice_detail: raw, allocated_amount: balance || row.allocated_amount || 0 });
                    }}
                  />
                ),
              },
              { title: 'Allocated Amount', dataIndex: 'allocated_amount', width: 180, align: 'right',
                render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateAlloc(idx, { allocated_amount: v ?? 0 })} /> },
              { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeAlloc(idx)} /> },
            ]}
            footer={() => (
              <Row justify="space-between">
                <Col><Button icon={<PlusOutlined />} type="dashed" onClick={addAlloc}>Add Invoice</Button></Col>
                <Col>
                  <Space size="large">
                    <Text>Allocated: <strong>{money(totalAllocated)}</strong></Text>
                    <Text type={remaining < 0 ? 'danger' : 'secondary'}>Remaining: <strong>{money(remaining)}</strong></Text>
                  </Space>
                </Col>
              </Row>
            )}
          />
        </FormSection>

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
