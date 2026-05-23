import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert, Table, Button, Switch, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const newKey = () => Math.random().toString(36).slice(2);
const emptyComp = () => ({ _key: newKey(), product_id: null, product_detail: null, product_name: '', quantity: 1, unit_code: '', wastage: 0, cost: 0, notes: '' });

export default function BomAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [components, setComponents] = useState([emptyComp()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);
  const [active, setActive] = useState(true);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, initialRecord.bom_no ? 'bom_no' : 'code') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        bom_no: docNumber,
        bom_date: toDayjs(initialRecord.bom_date || initialRecord.date) || dayjs(),
        finished_product_id: initialRecord.finished_product_id ?? initialRecord.finished_product?.id ?? null,
        unit_code: initialRecord.unit_code || initialRecord.unit || '',
        quantity: toNumber(initialRecord.output_quantity ?? initialRecord.quantity) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
      });
      setActive(initialRecord.active !== false);
      const lines = Array.isArray(initialRecord.raw_materials || initialRecord.items) ? (initialRecord.raw_materials || initialRecord.items) : [];
      if (lines.length) {
        setComponents(lines.map((l) => ({
          _key: newKey(),
          id: l.id,
          product_id: l.product_id ?? l.product?.id ?? null,
          product_detail: l.product || l.product_id_detail || null,
          product_name: l.product_name || l.product?.name || '',
          quantity: toNumber(l.quantity) || 1,
          unit_code: l.unit_code || '',
          wastage: toNumber(l.wastage || 0),
          cost: toNumber(l.cost || l.rate || 0),
          notes: l.notes || '',
        })));
      }
    } else {
      form.setFieldsValue({ bom_no: '#DRAFT', bom_date: dayjs(), quantity: 1 });
    }
  }, [initialRecord]);

  const updateComp = (idx, patch) => setComponents((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addComp = () => setComponents((p) => [...p, emptyComp()]);
  const removeComp = (idx) => setComponents((prev) => {
    const row = prev[idx];
    if (row?.id) setDeletedItemIds((ids) => [...ids, row.id]);
    return prev.filter((_, i) => i !== idx);
  });

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const rawMaterials = components.filter((l) => !!asId(l.product_id)).map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      product_id: asId(l.product_id),
      product_name: l.product_name || null,
      quantity: toNumber(l.quantity),
      unit_code: nullIfEmpty(l.unit_code),
      wastage: toNumber(l.wastage),
      cost: toNumber(l.cost),
      notes: nullIfEmpty(l.notes),
    }));
    if (!rawMaterials.length) { setTopError('At least one component is required.'); return; }
    const payload = {
      code: null,
      date: formatDate(v.bom_date),
      finished_product_id: asId(v.finished_product_id),
      unit_code: nullIfEmpty(v.unit_code),
      output_quantity: toNumber(v.quantity) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      active,
      raw_materials: rawMaterials,
      deleted_item_ids: deletedItemIds,
    };
    setSubmitting(true);
    try {
      const res = isEdit ? await patchJson(`/api/bills-of-material/${recordId}/`, payload) : await postJson('/api/bills-of-material/', payload);
      message.success(isEdit ? 'BOM updated' : 'BOM created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('inventory.bill-of-materials.show', id));
      else router.visit(route('inventory.bill-of-materials.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit BOM' : 'New BOM'} headTitle={isEdit ? 'Edit BOM' : 'New BOM'}
      onBack={() => router.visit(route('inventory.bill-of-materials.index'))} onCancel={() => router.visit(route('inventory.bill-of-materials.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update BOM' : 'Save BOM'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="BOM details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Finished Product" name="finished_product_id" rules={[{ required: true, message: 'Finished product is required' }]}>
                <BackendSelect fkUrl="/api/products/search" labelKey="label" placeholder="Select finished product" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}><Form.Item label="BOM No" name="bom_no"><Input disabled /></Form.Item></Col>
            <Col xs={24} sm={12} md={6}><Form.Item label="Date" name="bom_date" rules={[{ required: true, message: 'Date is required' }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={6}><Form.Item label="Output Quantity" name="quantity" rules={[{ required: true, message: 'Required' }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12} md={6}><Form.Item label="Unit" name="unit_code"><Input placeholder="e.g. PCS" /></Form.Item></Col>
            <Col xs={24} sm={12} md={6}><Form.Item label="Active"><Space><Switch checked={active} onChange={setActive} /><Typography.Text>{active ? 'Active' : 'Inactive'}</Typography.Text></Space></Form.Item></Col>
            <Col xs={24}><Form.Item label="Reference" name="reference"><Input placeholder="Reference" /></Form.Item></Col>
          </Row>
        </FormSection>

        <FormSection title="Components / Raw materials">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={components}
            columns={[
              { title: 'Component', dataIndex: 'product_id', render: (val, row, idx) => (
                <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" placeholder="Select component" variant="borderless" style={{ width: '100%' }}
                  onChange={(v, raw) => updateComp(idx, { product_id: v, product_detail: raw, product_name: raw?.name || raw?.label || '' })} />
              ) },
              { title: 'Qty', dataIndex: 'quantity', width: 100, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateComp(idx, { quantity: v ?? 0 })} /> },
              { title: 'Unit', dataIndex: 'unit_code', width: 100, render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateComp(idx, { unit_code: e.target.value })} /> },
              { title: 'Wastage %', dataIndex: 'wastage', width: 110, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%' }} onChange={(v) => updateComp(idx, { wastage: v ?? 0 })} /> },
              { title: 'Cost', dataIndex: 'cost', width: 120, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateComp(idx, { cost: v ?? 0 })} /> },
              { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeComp(idx)} /> },
            ]}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addComp}>Add Component</Button>}
          />
        </FormSection>

        <FormSection title="Notes"><Form.Item name="notes"><Input.TextArea rows={3} placeholder="Notes" /></Form.Item></FormSection>
      </Form>
    </TransactionFormShell>
  );
}
