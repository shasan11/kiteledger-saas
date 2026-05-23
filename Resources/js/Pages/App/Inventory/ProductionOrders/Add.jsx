import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert, Table, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { getJson, postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyMat = () => ({ _key: newKey(), product_id: null, product_detail: null, required_qty: 0, unit_code: '' });

export default function ProductionOrderAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [bomId, setBomId] = useState(null);
  const [bomDetail, setBomDetail] = useState(null);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, initialRecord.production_order_no ? 'production_order_no' : 'code') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        production_order_no: docNumber,
        production_order_date: toDayjs(initialRecord.date || initialRecord.production_order_date) || dayjs(),
        bom_id: initialRecord.bom_id ?? initialRecord.bom?.id ?? null,
        finished_product_id: initialRecord.finished_product_id ?? initialRecord.finished_product?.id ?? null,
        planned_qty: toNumber(initialRecord.output_quantity ?? initialRecord.planned_qty) || 1,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        raw_material_warehouse_id: initialRecord.raw_material_warehouse_id ?? null,
        finished_goods_warehouse_id: initialRecord.finished_goods_warehouse_id ?? null,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
      });
      setBomId(initialRecord.bom_id || null);
      const lines = Array.isArray(initialRecord.materials || initialRecord.items) ? (initialRecord.materials || initialRecord.items) : [];
      setMaterials(lines.map((l) => ({
        _key: newKey(), id: l.id,
        product_id: l.product_id ?? l.product?.id ?? null,
        product_detail: l.product || null,
        required_qty: toNumber(l.required_qty ?? l.quantity),
        unit_code: l.unit_code || '',
      })));
    } else {
      form.setFieldsValue({ production_order_no: '#DRAFT', production_order_date: dayjs(), planned_qty: 1 });
    }
  }, [initialRecord]);

  const recalcMaterials = (bomData, plannedQty) => {
    const ratio = plannedQty / (toNumber(bomData?.output_quantity) || 1);
    const raws = Array.isArray(bomData?.raw_materials) ? bomData.raw_materials : [];
    setMaterials(raws.map((r) => ({
      _key: newKey(),
      product_id: r.product_id ?? r.product?.id ?? null,
      product_detail: r.product || null,
      required_qty: toNumber(r.quantity) * ratio,
      unit_code: r.unit_code || '',
    })));
  };

  const onPickBom = async (v, raw) => {
    setBomId(v);
    setBomDetail(raw);
    form.setFieldValue('bom_id', v);
    if (raw) {
      form.setFieldValue('finished_product_id', raw.finished_product_id ?? raw.finished_product?.id ?? null);
      const planned = toNumber(form.getFieldValue('planned_qty')) || toNumber(raw.output_quantity) || 1;
      if (!form.getFieldValue('planned_qty')) form.setFieldValue('planned_qty', planned);
      // Fetch full BOM detail if raw didn't include raw_materials
      let bomData = raw;
      if (!Array.isArray(raw.raw_materials)) {
        try { const res = await getJson(`/api/bills-of-material/${v}/`); bomData = res?.data || raw; setBomDetail(bomData); } catch {}
      }
      recalcMaterials(bomData, planned);
    }
  };

  const updateMat = (idx, patch) => setMaterials((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addMat = () => setMaterials((p) => [...p, emptyMat()]);
  const removeMat = (idx) => setMaterials((prev) => { const r = prev[idx]; if (r?.id) setDeletedItemIds((ids) => [...ids, r.id]); return prev.filter((_, i) => i !== idx); });

  const onPlannedQtyChange = (v) => {
    form.setFieldValue('planned_qty', v ?? 0);
    if (bomDetail) recalcMaterials(bomDetail, toNumber(v));
  };

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const payload = {
      code: null,
      date: formatDate(v.production_order_date),
      bom_id: bomId,
      finished_product_id: asId(v.finished_product_id),
      output_quantity: toNumber(v.planned_qty) || 1,
      warehouse_id: asId(v.warehouse_id),
      raw_material_warehouse_id: asId(v.raw_material_warehouse_id),
      finished_goods_warehouse_id: asId(v.finished_goods_warehouse_id),
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      materials: materials.filter((m) => !!asId(m.product_id)).map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        product_id: asId(m.product_id),
        required_qty: toNumber(m.required_qty),
        unit_code: nullIfEmpty(m.unit_code),
      })),
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/production-orders/${recordId}/`, payload) : await postJson('/api/production-orders/', payload);
      message.success(isEdit ? 'Production order updated' : 'Production order created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('inventory.production-orders.show', id));
      else router.visit(route('inventory.production-orders.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Production Order' : 'New Production Order'} headTitle={isEdit ? 'Edit Production Order' : 'New Production Order'}
      onBack={() => router.visit(route('inventory.production-orders.index'))} onCancel={() => router.visit(route('inventory.production-orders.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update Production Order' : 'Save Production Order'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Production order details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Bill of Materials" name="bom_id">
                <BackendSelect fkUrl="/api/bills-of-material/" labelKey="code" placeholder="Select BOM" onChange={onPickBom} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}><Form.Item label="PO No" name="production_order_no"><Input disabled /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Date" name="production_order_date" rules={[{ required: true }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Finished Product" name="finished_product_id" rules={[{ required: true }]}><BackendSelect fkUrl="/api/products/search" labelKey="label" /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Planned Qty" name="planned_qty" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} onChange={onPlannedQtyChange} /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Warehouse" name="warehouse_id"><BackendSelect fkUrl="/api/warehouses/" placeholder="Warehouse" allowClear /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Raw Material Warehouse" name="raw_material_warehouse_id"><BackendSelect fkUrl="/api/warehouses/" allowClear /></Form.Item></Col>
            <Col xs={24} sm={12} md={8}><Form.Item label="Finished Goods Warehouse" name="finished_goods_warehouse_id"><BackendSelect fkUrl="/api/warehouses/" allowClear /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Reference" name="reference"><Input placeholder="Reference" /></Form.Item></Col>
          </Row>
        </FormSection>

        <FormSection title="Material requirements">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={materials}
            columns={[
              { title: 'Component', dataIndex: 'product_id', render: (val, row, idx) => (
                <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" variant="borderless" style={{ width: '100%' }}
                  onChange={(v, raw) => updateMat(idx, { product_id: v, product_detail: raw })} />
              ) },
              { title: 'Required Qty', dataIndex: 'required_qty', width: 140, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateMat(idx, { required_qty: v ?? 0 })} /> },
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
