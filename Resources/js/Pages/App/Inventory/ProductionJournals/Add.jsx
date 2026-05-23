import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert, Table, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import ReferenceAutocomplete from '@/Components/Transactions/ReferenceAutocomplete.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyMat = () => ({ _key: newKey(), product_id: null, product_detail: null, consumed_qty: 0, unit_code: '' });

export default function ProductionJournalAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [productionOrderId, setProductionOrderId] = useState(null);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, initialRecord.production_journal_no ? 'production_journal_no' : 'code') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        production_journal_no: docNumber,
        production_journal_date: toDayjs(initialRecord.date || initialRecord.production_journal_date) || dayjs(),
        finished_product_id: initialRecord.finished_product_id ?? initialRecord.finished_product?.id ?? null,
        produced_qty: toNumber(initialRecord.produced_qty ?? initialRecord.output_quantity) || 1,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
      });
      setProductionOrderId(initialRecord.production_order_id || null);
      const lines = Array.isArray(initialRecord.consumed_materials || initialRecord.materials) ? (initialRecord.consumed_materials || initialRecord.materials) : [];
      setMaterials(lines.map((l) => ({
        _key: newKey(), id: l.id,
        product_id: l.product_id ?? l.product?.id ?? null,
        product_detail: l.product || null,
        consumed_qty: toNumber(l.consumed_qty ?? l.quantity),
        unit_code: l.unit_code || '',
      })));
    } else {
      form.setFieldsValue({ production_journal_no: '#DRAFT', production_journal_date: dayjs(), produced_qty: 1 });
    }
  }, [initialRecord]);

  const onPickPO = (rec) => {
    if (!rec) return;
    setProductionOrderId(rec.id);
    form.setFieldsValue({
      finished_product_id: rec.finished_product_id ?? rec.finished_product?.id ?? null,
      produced_qty: toNumber(rec.output_quantity ?? rec.planned_qty) || 1,
      warehouse_id: rec.warehouse_id ?? rec.warehouse?.id ?? form.getFieldValue('warehouse_id') ?? null,
    });
    const mats = Array.isArray(rec.materials) ? rec.materials : [];
    setMaterials(mats.map((m) => ({
      _key: newKey(),
      product_id: m.product_id ?? m.product?.id ?? null,
      product_detail: m.product || null,
      consumed_qty: toNumber(m.required_qty ?? m.quantity),
      unit_code: m.unit_code || '',
    })));
  };

  const updateMat = (idx, patch) => setMaterials((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addMat = () => setMaterials((p) => [...p, emptyMat()]);
  const removeMat = (idx) => setMaterials((prev) => { const r = prev[idx]; if (r?.id) setDeletedItemIds((ids) => [...ids, r.id]); return prev.filter((_, i) => i !== idx); });

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const payload = {
      code: null,
      date: formatDate(v.production_journal_date),
      production_order_id: productionOrderId,
      finished_product_id: asId(v.finished_product_id),
      produced_qty: toNumber(v.produced_qty),
      warehouse_id: asId(v.warehouse_id),
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      consumed_materials: materials.filter((m) => !!asId(m.product_id)).map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        product_id: asId(m.product_id),
        consumed_qty: toNumber(m.consumed_qty),
        unit_code: nullIfEmpty(m.unit_code),
      })),
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/production-journals/${recordId}/`, payload) : await postJson('/api/production-journals/', payload);
      message.success(isEdit ? 'Production journal updated' : 'Production journal created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('inventory.production-journals.show', id));
      else router.visit(route('inventory.production-journals.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Production Journal' : 'New Production Journal'} headTitle={isEdit ? 'Edit Production Journal' : 'New Production Journal'}
      onBack={() => router.visit(route('inventory.production-journals.index'))} onCancel={() => router.visit(route('inventory.production-journals.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update Production Journal' : 'Save Production Journal'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Production journal details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Production Order (reference)" name="reference">
                <ReferenceAutocomplete
                  sources={[{ key: 'production_order', label: 'Production Order', url: '/api/production-orders/', searchParam: 'search', numberField: 'code', dateField: 'date' }]}
                  onPick={onPickPO}
                  placeholder="Search production orders"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}><Form.Item label="Journal No" name="production_journal_no"><Input disabled /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Date" name="production_journal_date" rules={[{ required: true }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Finished Product" name="finished_product_id" rules={[{ required: true }]}><BackendSelect fkUrl="/api/products/search" labelKey="label" /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Produced Qty" name="produced_qty" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Warehouse" name="warehouse_id"><BackendSelect fkUrl="/api/warehouses/" allowClear /></Form.Item></Col>
          </Row>
        </FormSection>

        <FormSection title="Consumed materials">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={materials}
            columns={[
              { title: 'Material', dataIndex: 'product_id', render: (val, row, idx) => (
                <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" variant="borderless" style={{ width: '100%' }}
                  onChange={(v, raw) => updateMat(idx, { product_id: v, product_detail: raw })} />
              ) },
              { title: 'Consumed Qty', dataIndex: 'consumed_qty', width: 140, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateMat(idx, { consumed_qty: v ?? 0 })} /> },
              { title: 'Unit', dataIndex: 'unit_code', width: 100, render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateMat(idx, { unit_code: e.target.value })} /> },
              { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMat(idx)} /> },
            ]}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addMat}>Add Material</Button>}
          />
        </FormSection>

        <FormSection title="Notes"><Form.Item name="notes"><Input.TextArea rows={3} placeholder="Notes" /></Form.Item></FormSection>
      </Form>
    </TransactionFormShell>
  );
}
