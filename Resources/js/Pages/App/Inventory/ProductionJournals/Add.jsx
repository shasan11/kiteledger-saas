import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert, Table, Button, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { getJson, postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const newKey = () => Math.random().toString(36).slice(2);
const emptyMat = () => ({ _key: newKey(), product_id: null, product_detail: null, quantity: 0, unit_code: '', rate: 0, amount: 0 });
const emptyByProduct = () => ({ _key: newKey(), product_id: null, product_detail: null, cost_percent: 0, quantity: 0, unit_code: '', allocated_cost: 0 });
const emptyExpense = () => ({ _key: newKey(), cost_term_id: null, cost_term_detail: null, amount: 0, notes: '' });

export default function ProductionJournalAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([emptyMat()]);
  const [byProducts, setByProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deletedMatIds, setDeletedMatIds] = useState([]);
  const [deletedByProductIds, setDeletedByProductIds] = useState([]);
  const [deletedExpenseIds, setDeletedExpenseIds] = useState([]);
  const [poId, setPoId] = useState(null);
  const [poDetail, setPoDetail] = useState(null);
  const [loadingPo, setLoadingPo] = useState(false);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'code') : '#DRAFT';

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        journal_no: docNumber,
        date: toDayjs(initialRecord.date) || dayjs(),
        finished_product_id: initialRecord.finished_product_id ?? initialRecord.finishedProduct?.id ?? null,
        output_quantity: toNumber(initialRecord.output_quantity) || 1,
        output_unit_code: initialRecord.output_unit_code || '',
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
      });
      setPoId(initialRecord.production_order_id || null);

      const mats = Array.isArray(initialRecord.rawMaterials) ? initialRecord.rawMaterials : [];
      if (mats.length) {
        setMaterials(mats.map((l) => ({
          _key: newKey(), id: l.id,
          product_id: l.product_id ?? l.product?.id ?? null,
          product_detail: l.product || null,
          quantity: toNumber(l.quantity),
          unit_code: l.unit_code || '',
          rate: toNumber(l.rate || 0),
          amount: toNumber(l.amount || 0),
        })));
      }

      const bps = Array.isArray(initialRecord.byProducts) ? initialRecord.byProducts : [];
      if (bps.length) {
        setByProducts(bps.map((l) => ({
          _key: newKey(), id: l.id,
          product_id: l.product_id ?? l.product?.id ?? null,
          product_detail: l.product || null,
          cost_percent: toNumber(l.cost_percent || 0),
          quantity: toNumber(l.quantity),
          unit_code: l.unit_code || '',
          allocated_cost: toNumber(l.allocated_cost || 0),
        })));
      }

      const exps = Array.isArray(initialRecord.productionExpenses) ? initialRecord.productionExpenses : [];
      if (exps.length) {
        setExpenses(exps.map((l) => ({
          _key: newKey(), id: l.id,
          cost_term_id: l.cost_term_id ?? l.costTerm?.id ?? null,
          cost_term_detail: l.costTerm || null,
          amount: toNumber(l.amount || 0),
          notes: l.notes || '',
        })));
      }
    } else {
      form.setFieldsValue({ journal_no: '#DRAFT', date: dayjs(), output_quantity: 1 });
    }
  }, [initialRecord]);

  const loadFromPO = async () => {
    const selectedPoId = poId;
    if (!selectedPoId) { message.warning('Select a Production Order first'); return; }
    setLoadingPo(true);
    try {
      const res = await axios.get(`${BACKEND}/api/production-orders/${selectedPoId}/`, { headers: authHeaders() });
      const po = res.data;
      setPoDetail(po);

      if (po.finished_product_id) form.setFieldValue('finished_product_id', po.finished_product_id);
      if (po.warehouse_id) form.setFieldValue('warehouse_id', po.warehouse_id);
      if (po.output_quantity) form.setFieldValue('output_quantity', toNumber(po.output_quantity));
      if (po.output_unit_code || po.productUnit?.name) form.setFieldValue('output_unit_code', po.output_unit_code || po.productUnit?.name || '');

      const rms = Array.isArray(po.rawMaterials) ? po.rawMaterials : (Array.isArray(po.raw_materials) ? po.raw_materials : []);
      if (rms.length) {
        setMaterials(rms.map((r) => ({
          _key: newKey(),
          product_id: r.product_id ?? r.product?.id ?? null,
          product_detail: r.product || null,
          quantity: toNumber(r.quantity),
          unit_code: r.unit_code || r.productUnit?.name || '',
          rate: toNumber(r.unit_cost || 0),
          amount: toNumber(r.total_cost || (r.quantity * r.unit_cost) || 0),
        })));
      }

      message.success('Loaded from Production Order');
    } catch (e) {
      message.error('Failed to load Production Order');
    } finally {
      setLoadingPo(false);
    }
  };

  const updateMat = (idx, patch) => setMaterials((p) => p.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const addMat = () => setMaterials((p) => [...p, emptyMat()]);
  const removeMat = (idx) => setMaterials((prev) => {
    const r = prev[idx]; if (r?.id) setDeletedMatIds((ids) => [...ids, r.id]);
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

    const validMats = materials.filter((m) => !!asId(m.product_id));
    if (!validMats.length) { setTopError('At least one raw material is required.'); return; }

    const payload = {
      date: formatDate(v.date),
      finished_product_id: asId(v.finished_product_id),
      output_quantity: toNumber(v.output_quantity),
      output_unit_code: nullIfEmpty(v.output_unit_code),
      warehouse_id: asId(v.warehouse_id),
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      raw_materials: validMats.map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        product_id: asId(m.product_id),
        quantity: toNumber(m.quantity),
        unit_code: nullIfEmpty(m.unit_code),
        rate: toNumber(m.rate),
        amount: toNumber(m.amount) || toNumber(m.quantity) * toNumber(m.rate),
      })),
      by_products: byProducts.filter((b) => !!asId(b.product_id)).map((b) => ({
        ...(b.id ? { id: b.id } : {}),
        product_id: asId(b.product_id),
        cost_percent: toNumber(b.cost_percent),
        quantity: toNumber(b.quantity),
        unit_code: nullIfEmpty(b.unit_code),
        allocated_cost: toNumber(b.allocated_cost),
      })),
      production_expenses: expenses.filter((e) => toNumber(e.amount) > 0 || e.cost_term_id).map((e) => ({
        ...(e.id ? { id: e.id } : {}),
        cost_term_id: asId(e.cost_term_id),
        amount: toNumber(e.amount),
        notes: nullIfEmpty(e.notes),
      })),
      deleted_raw_material_ids: deletedMatIds,
      deleted_by_product_ids: deletedByProductIds,
      deleted_production_expense_ids: deletedExpenseIds,
    };

    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/production-journals/${recordId}/`, payload)
        : await postJson('/api/production-journals/', payload);
      message.success(isEdit ? 'Production journal updated' : 'Production journal created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('inventory.production-journals.show', id));
      else router.visit(route('inventory.production-journals.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  const matCols = [
    { title: 'Material', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" placeholder="Select material"
        variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateMat(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Qty', dataIndex: 'quantity', width: 110, align: 'right',
      render: (val, row, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }}
        onChange={(v) => updateMat(idx, { quantity: v ?? 0, amount: (v ?? 0) * toNumber(row.rate) })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 80,
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateMat(idx, { unit_code: e.target.value })} placeholder="PCS" /> },
    { title: 'Rate', dataIndex: 'rate', width: 120, align: 'right',
      render: (val, row, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }}
        onChange={(v) => updateMat(idx, { rate: v ?? 0, amount: toNumber(row.quantity) * (v ?? 0) })} /> },
    { title: 'Amount', dataIndex: 'amount', width: 130, align: 'right',
      render: (val, row) => (val || toNumber(row.quantity) * toNumber(row.rate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMat(idx)} disabled={materials.length <= 1} /> },
  ];

  const byProductCols = [
    { title: 'By-product', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label" placeholder="Select product"
        variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateByProduct(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Cost %', dataIndex: 'cost_percent', width: 100, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { cost_percent: v ?? 0 })} /> },
    { title: 'Qty', dataIndex: 'quantity', width: 110, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { quantity: v ?? 0 })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 80,
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateByProduct(idx, { unit_code: e.target.value })} /> },
    { title: 'Allocated Cost', dataIndex: 'allocated_cost', width: 140, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { allocated_cost: v ?? 0 })} /> },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeByProduct(idx)} /> },
  ];

  const expenseCols = [
    { title: 'Cost Term', dataIndex: 'cost_term_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.cost_term_detail} fkUrl="/api/production-cost-terms/" labelKey="name"
        placeholder="Select cost term" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateExpense(idx, { cost_term_id: v, cost_term_detail: raw })} />
    ) },
    { title: 'Amount', dataIndex: 'amount', width: 160, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateExpense(idx, { amount: v ?? 0 })} /> },
    { title: 'Notes', dataIndex: 'notes',
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateExpense(idx, { notes: e.target.value })} placeholder="Optional" /> },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeExpense(idx)} /> },
  ];

  return (
    <TransactionFormShell auth={props.auth}
      title={isEdit ? 'Edit Production Journal' : 'New Production Journal'}
      headTitle={isEdit ? 'Edit Production Journal' : 'New Production Journal'}
      onBack={() => router.visit(route('inventory.production-journals.index'))}
      onCancel={() => router.visit(route('inventory.production-journals.index'))}
      onSubmit={onSubmit} submitting={submitting}
      submitLabel={isEdit ? 'Update Journal' : 'Save Journal'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Journal details">
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item label="Production Order (optional — load to auto-fill)">
                <Row gutter={8}>
                  <Col flex="1">
                    <BackendSelect
                      value={poId}
                      detailValue={poDetail}
                      fkUrl="/api/production-orders/"
                      labelKey="code"
                      labelFn={(r) => `${r.code || '#draft'} — ${r.finishedProduct?.name || r.finished_product_id || ''}`}
                      placeholder="Search approved production orders"
                      extraParams={{ approved: true }}
                      onChange={(v, raw) => { setPoId(v); setPoDetail(raw); }}
                    />
                  </Col>
                  <Col>
                    <Tooltip title="Load details from selected PO">
                      <Button icon={<DownloadOutlined />} onClick={loadFromPO} loading={loadingPo}>
                        Load from PO
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="Journal No" name="journal_no"><Input disabled /></Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Date is required' }]}>
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Finished Product" name="finished_product_id" rules={[{ required: true, message: 'Finished product is required' }]}>
                <BackendSelect fkUrl="/api/products/search" labelKey="label" extraParams={{ active: true }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Warehouse" name="warehouse_id" rules={[{ required: true, message: 'Warehouse is required' }]}>
                <BackendSelect fkUrl="/api/warehouses/" labelKey="name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Output Quantity" name="output_quantity" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Output Unit" name="output_unit_code">
                <Input placeholder="PCS" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Reference" name="reference">
                <Input placeholder="Reference" />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        <FormSection title="Raw materials consumed">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={materials} columns={matCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addMat}>Add Material</Button>}
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

        <FormSection title="Notes">
          <Form.Item name="notes"><Input.TextArea rows={3} placeholder="Notes" /></Form.Item>
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
