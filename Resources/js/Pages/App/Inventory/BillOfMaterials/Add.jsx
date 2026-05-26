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
import { DescriptionRemarksCollapse } from '@/Components/Transactions';

const newKey = () => Math.random().toString(36).slice(2);
const emptyRaw = () => ({ _key: newKey(), product_id: null, product_detail: null, quantity: 1, unit_code: '', wastage_percent: 0, notes: '' });
const emptyByProduct = () => ({ _key: newKey(), product_id: null, product_detail: null, cost_percent: 0, quantity: 0, unit_code: '', notes: '' });
const emptyExpense = () => ({ _key: newKey(), cost_term_id: null, cost_term_detail: null, amount: 0, notes: '' });

export default function BomAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([emptyRaw()]);
  const [byProducts, setByProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deletedRawIds, setDeletedRawIds] = useState([]);
  const [deletedByProductIds, setDeletedByProductIds] = useState([]);
  const [deletedExpenseIds, setDeletedExpenseIds] = useState([]);
  const [active, setActive] = useState(true);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'code') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        bom_no: docNumber,
        date: toDayjs(initialRecord.date) || dayjs(),
        product_id: initialRecord.product_id ?? initialRecord.product?.id ?? null,
        output_quantity: toNumber(initialRecord.output_quantity) || 1,
        output_unit_code: initialRecord.output_unit_code || '',
        manufacture_on_every_sale: !!initialRecord.manufacture_on_every_sale,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      setActive(initialRecord.active !== false);

      if (Array.isArray(initialRecord.rawMaterials) && initialRecord.rawMaterials.length) {
        setRawMaterials(initialRecord.rawMaterials.map((l) => ({
          _key: newKey(), id: l.id,
          product_id: l.product_id ?? l.product?.id ?? null,
          product_detail: l.product || null,
          quantity: toNumber(l.quantity) || 1,
          unit_code: l.unit_code || '',
          wastage_percent: toNumber(l.wastage_percent || 0),
          notes: l.notes || '',
        })));
      }

      if (Array.isArray(initialRecord.byProducts) && initialRecord.byProducts.length) {
        setByProducts(initialRecord.byProducts.map((l) => ({
          _key: newKey(), id: l.id,
          product_id: l.product_id ?? l.product?.id ?? null,
          product_detail: l.product || null,
          cost_percent: toNumber(l.cost_percent || 0),
          quantity: toNumber(l.quantity || 0),
          unit_code: l.unit_code || '',
          notes: l.notes || '',
        })));
      }

      if (Array.isArray(initialRecord.expenses) && initialRecord.expenses.length) {
        setExpenses(initialRecord.expenses.map((l) => ({
          _key: newKey(), id: l.id,
          cost_term_id: l.cost_term_id ?? l.costTerm?.id ?? null,
          cost_term_detail: l.costTerm || null,
          amount: toNumber(l.amount || 0),
          notes: l.notes || '',
        })));
      }
    } else {
      form.setFieldsValue({ bom_no: '#DRAFT', date: dayjs(), output_quantity: 1 });
    }
  }, [initialRecord]);

  const updateRaw = (idx, patch) => setRawMaterials((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addRaw = () => setRawMaterials((p) => [...p, emptyRaw()]);
  const removeRaw = (idx) => setRawMaterials((prev) => {
    const r = prev[idx]; if (r?.id) setDeletedRawIds((ids) => [...ids, r.id]);
    return prev.filter((_, i) => i !== idx);
  });

  const updateByProduct = (idx, patch) => setByProducts((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addByProduct = () => setByProducts((p) => [...p, emptyByProduct()]);
  const removeByProduct = (idx) => setByProducts((prev) => {
    const r = prev[idx]; if (r?.id) setDeletedByProductIds((ids) => [...ids, r.id]);
    return prev.filter((_, i) => i !== idx);
  });

  const updateExpense = (idx, patch) => setExpenses((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addExpense = () => setExpenses((p) => [...p, emptyExpense()]);
  const removeExpense = (idx) => setExpenses((prev) => {
    const r = prev[idx]; if (r?.id) setDeletedExpenseIds((ids) => [...ids, r.id]);
    return prev.filter((_, i) => i !== idx);
  });

  const onSubmit = async () => {
    setTopError(null);
    const v = await form.validateFields().catch(() => null);
    if (!v) return;

    const validRaw = rawMaterials.filter((l) => !!asId(l.product_id));
    if (!validRaw.length) { setTopError('At least one raw material is required.'); return; }

    const payload = {
      date: formatDate(v.date),
      product_id: asId(v.product_id),
      output_quantity: toNumber(v.output_quantity) || 1,
      output_unit_code: nullIfEmpty(v.output_unit_code),
      manufacture_on_every_sale: !!v.manufacture_on_every_sale,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      active,
      raw_materials: validRaw.map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        product_id: asId(l.product_id),
        quantity: toNumber(l.quantity),
        unit_code: nullIfEmpty(l.unit_code),
        wastage_percent: toNumber(l.wastage_percent),
        notes: nullIfEmpty(l.notes),
      })),
      by_products: byProducts.filter((l) => !!asId(l.product_id)).map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        product_id: asId(l.product_id),
        cost_percent: toNumber(l.cost_percent),
        quantity: toNumber(l.quantity),
        unit_code: nullIfEmpty(l.unit_code),
        notes: nullIfEmpty(l.notes),
      })),
      production_expenses: expenses.filter((l) => toNumber(l.amount) > 0 || l.cost_term_id).map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        cost_term_id: asId(l.cost_term_id),
        amount: toNumber(l.amount),
        notes: nullIfEmpty(l.notes),
      })),
      deleted_raw_material_ids: deletedRawIds,
      deleted_by_product_ids: deletedByProductIds,
      deleted_expense_ids: deletedExpenseIds,
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

  const rawCols = [
    { title: 'Component', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" placeholder="Select component" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateRaw(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Qty', dataIndex: 'quantity', width: 100, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateRaw(idx, { quantity: v ?? 0 })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 90, render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateRaw(idx, { unit_code: e.target.value })} placeholder="PCS" /> },
    { title: 'Wastage %', dataIndex: 'wastage_percent', width: 110, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%' }} onChange={(v) => updateRaw(idx, { wastage_percent: v ?? 0 })} /> },
    { title: 'Notes', dataIndex: 'notes', render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateRaw(idx, { notes: e.target.value })} placeholder="Optional" /> },
    { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRaw(idx)} disabled={rawMaterials.length <= 1} /> },
  ];

  const byProductCols = [
    { title: 'By-product', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" placeholder="Select product" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateByProduct(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Cost %', dataIndex: 'cost_percent', width: 100, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { cost_percent: v ?? 0 })} /> },
    { title: 'Qty', dataIndex: 'quantity', width: 100, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { quantity: v ?? 0 })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 90, render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateByProduct(idx, { unit_code: e.target.value })} placeholder="PCS" /> },
    { title: 'Notes', dataIndex: 'notes', render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateByProduct(idx, { notes: e.target.value })} placeholder="Optional" /> },
    { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeByProduct(idx)} /> },
  ];

  const expenseCols = [
    { title: 'Cost Term', dataIndex: 'cost_term_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.cost_term_detail} fkUrl="/api/production-cost-terms/" labelKey="name" placeholder="Select cost term" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateExpense(idx, { cost_term_id: v, cost_term_detail: raw })} />
    ) },
    { title: 'Amount', dataIndex: 'amount', width: 160, align: 'right', render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateExpense(idx, { amount: v ?? 0 })} /> },
    { title: 'Notes', dataIndex: 'notes', render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateExpense(idx, { notes: e.target.value })} placeholder="Optional" /> },
    { title: '', key: 'remove', width: 50, render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeExpense(idx)} /> },
  ];

  return (
    <TransactionFormShell auth={props.auth} title={isEdit ? 'Edit Bill of Materials' : 'New Bill of Materials'}
      headTitle={isEdit ? 'Edit BOM' : 'New BOM'}
      onBack={() => router.visit(route('inventory.bill-of-materials.index'))}
      onCancel={() => router.visit(route('inventory.bill-of-materials.index'))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={isEdit ? 'Update BOM' : 'Save BOM'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="BOM details">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Finished Product" name="product_id" rules={[{ required: true, message: 'Finished product is required' }]}>
                <BackendSelect fkUrl="/api/products/search" labelKey="label" placeholder="Select finished product"
                  extraParams={{ active: true, product_type: 'goods' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="BOM No" name="bom_no"><Input disabled /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Output Quantity" name="output_quantity" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Output Unit" name="output_unit_code">
                <Input placeholder="e.g. PCS, KG" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Active">
                <Space>
                  <Switch checked={active} onChange={setActive} />
                  <Typography.Text>{active ? 'Active' : 'Inactive'}</Typography.Text>
                </Space>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item label="Reference" name="reference">
                <Input placeholder="Reference / tag" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="manufacture_on_every_sale" valuePropName="checked" label=" ">
                <Switch />
                &nbsp;&nbsp;<Typography.Text>Auto-manufacture on every sale</Typography.Text>
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        <FormSection title="Raw materials / Components">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={rawMaterials} columns={rawCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addRaw}>Add Component</Button>}
          />
        </FormSection>

        <FormSection title="By-products (optional)">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={byProducts} columns={byProductCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addByProduct}>Add By-product</Button>}
          />
        </FormSection>

        <FormSection title="Production expenses (optional)">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={expenses} columns={expenseCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addExpense}>Add Expense</Button>}
          />
        </FormSection>

        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
