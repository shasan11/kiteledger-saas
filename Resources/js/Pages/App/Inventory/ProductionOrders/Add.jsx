import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Form, Input, InputNumber, DatePicker, Row, Col, message, Alert, Table, Button, Tooltip, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import TransactionFormShell, { FormSection } from '@/Components/Accounting/TransactionFormShell.jsx';
import BackendSelect from '@/Components/Accounting/BackendSelect.jsx';
import { getJson, postJson, patchJson, applyServerErrors } from '@/Components/Transactions/txnApi.js';
import { toNumber, asId, nullIfEmpty, formatDate, toDayjs } from '@/Components/Transactions/transactionCalculations.js';
import { displayDocumentNumber } from '@/Components/Transactions/documentNumber.js';
import { DescriptionRemarksCollapse } from '@/Components/Transactions';

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const newKey = () => Math.random().toString(36).slice(2);
const emptyMat = () => ({ _key: newKey(), product_id: null, product_detail: null, quantity: 0, unit_code: '', unit_cost: 0, total_cost: 0, notes: '' });
const emptyByProduct = () => ({ _key: newKey(), product_id: null, product_detail: null, quantity: 0, unit_code: '', cost_share_percent: 0, allocated_cost: 0, notes: '' });
const emptyExpense = () => ({ _key: newKey(), expense_account_id: null, expense_account_detail: null, name: '', amount: 0, notes: '' });

const fmtNum = (v) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductionOrderAdd({ initialRecord = null, isEdit = false, recordId = null, ...props }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState([emptyMat()]);
  const [byProducts, setByProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deletedMatIds, setDeletedMatIds] = useState([]);
  const [deletedByProductIds, setDeletedByProductIds] = useState([]);
  const [deletedExpenseIds, setDeletedExpenseIds] = useState([]);
  const [bomId, setBomId] = useState(null);
  const [bomDetail, setBomDetail] = useState(null);
  const [loadingBom, setLoadingBom] = useState(false);
  const [topError, setTopError] = useState(null);

  const docNumber = isEdit && initialRecord ? displayDocumentNumber(initialRecord, 'code') : '#DRAFT';

  const totalRawCost = materials.reduce((s, m) => s + toNumber(m.total_cost || toNumber(m.quantity) * toNumber(m.unit_cost)), 0);
  const totalExpCost = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const totalBpCost = byProducts.reduce((s, b) => s + toNumber(b.allocated_cost), 0);
  const totalCost = totalRawCost + totalExpCost - totalBpCost;

  useEffect(() => {
    if (initialRecord) {
      form.setFieldsValue({
        po_no: docNumber,
        date: toDayjs(initialRecord.date) || dayjs(),
        finished_product_id: initialRecord.finished_product_id ?? initialRecord.finishedProduct?.id ?? null,
        warehouse_id: initialRecord.warehouse_id ?? initialRecord.warehouse?.id ?? null,
        product_unit_id: initialRecord.product_unit_id ?? initialRecord.productUnit?.id ?? null,
        output_quantity: toNumber(initialRecord.output_quantity) || 1,
        reference: initialRecord.reference || '',
        notes: initialRecord.notes || '',
        remarks: initialRecord.remarks || '',
      });
      setBomId(initialRecord.bill_of_material_id || null);

      const rms = Array.isArray(initialRecord.rawMaterials) ? initialRecord.rawMaterials : [];
      if (rms.length) setMaterials(rms.map((l) => ({
        _key: newKey(), id: l.id,
        product_id: l.product_id ?? l.product?.id ?? null,
        product_detail: l.product || null,
        quantity: toNumber(l.quantity),
        unit_code: l.unit_code || l.productUnit?.name || '',
        unit_cost: toNumber(l.unit_cost || 0),
        total_cost: toNumber(l.total_cost || 0),
        notes: l.notes || '',
      })));

      const bps = Array.isArray(initialRecord.byproducts) ? initialRecord.byproducts : [];
      if (bps.length) setByProducts(bps.map((l) => ({
        _key: newKey(), id: l.id,
        product_id: l.product_id ?? l.product?.id ?? null,
        product_detail: l.product || null,
        quantity: toNumber(l.quantity),
        unit_code: l.unit_code || '',
        cost_share_percent: toNumber(l.cost_share_percent || 0),
        allocated_cost: toNumber(l.allocated_cost || 0),
        notes: l.notes || '',
      })));

      const exps = Array.isArray(initialRecord.expenses) ? initialRecord.expenses : [];
      if (exps.length) setExpenses(exps.map((l) => ({
        _key: newKey(), id: l.id,
        expense_account_id: l.expense_account_id ?? l.expenseAccount?.id ?? null,
        expense_account_detail: l.expenseAccount || null,
        name: l.name || '',
        amount: toNumber(l.amount || 0),
        notes: l.notes || '',
      })));
    } else {
      form.setFieldsValue({ po_no: '#DRAFT', date: dayjs(), output_quantity: 1 });
    }
  }, [initialRecord]);

  const loadFromBom = async () => {
    if (!bomId) { message.warning('Select a BOM first'); return; }
    setLoadingBom(true);
    try {
      const res = await axios.get(`${BACKEND}/api/bills-of-material/${bomId}/`, { headers: authHeaders() });
      const bom = res.data;
      setBomDetail(bom);

      const plannedQty = toNumber(form.getFieldValue('output_quantity')) || toNumber(bom.output_quantity) || 1;
      const scale = plannedQty / (toNumber(bom.output_quantity) || 1);

      if (bom.product_id && !form.getFieldValue('finished_product_id')) {
        form.setFieldValue('finished_product_id', bom.product_id);
      }
      if (bom.output_unit_code && !form.getFieldValue('product_unit_id')) {
        // unit is text-based in BOM, skip FK
      }

      const rms = Array.isArray(bom.rawMaterials) ? bom.rawMaterials : [];
      if (rms.length) {
        setMaterials(rms.map((r) => ({
          _key: newKey(),
          product_id: r.product_id ?? r.product?.id ?? null,
          product_detail: r.product || null,
          quantity: Math.round(toNumber(r.quantity) * scale * 10000) / 10000,
          unit_code: r.unit_code || '',
          unit_cost: 0,
          total_cost: 0,
          notes: '',
        })));
      }

      message.success('Loaded from BOM');
    } catch (e) {
      message.error('Failed to load BOM');
    } finally {
      setLoadingBom(false);
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
      bill_of_material_id: bomId || null,
      finished_product_id: asId(v.finished_product_id),
      warehouse_id: asId(v.warehouse_id),
      product_unit_id: asId(v.product_unit_id),
      output_quantity: toNumber(v.output_quantity) || 1,
      reference: nullIfEmpty(v.reference),
      notes: nullIfEmpty(v.notes),
      remarks: nullIfEmpty(v.remarks),
      raw_materials: validMats.map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        product_id: asId(m.product_id),
        quantity: toNumber(m.quantity),
        unit_cost: toNumber(m.unit_cost),
        total_cost: toNumber(m.total_cost) || toNumber(m.quantity) * toNumber(m.unit_cost),
        notes: nullIfEmpty(m.notes),
      })),
      byproducts: byProducts.filter((b) => !!asId(b.product_id)).map((b) => ({
        ...(b.id ? { id: b.id } : {}),
        product_id: asId(b.product_id),
        quantity: toNumber(b.quantity),
        cost_share_percent: toNumber(b.cost_share_percent),
        allocated_cost: toNumber(b.allocated_cost),
        notes: nullIfEmpty(b.notes),
      })),
      expenses: expenses.filter((e) => toNumber(e.amount) > 0 || e.name).map((e) => ({
        ...(e.id ? { id: e.id } : {}),
        expense_account_id: asId(e.expense_account_id),
        name: e.name,
        amount: toNumber(e.amount),
        notes: nullIfEmpty(e.notes),
      })),
      deleted_raw_material_ids: deletedMatIds,
      deleted_byproduct_ids: deletedByProductIds,
      deleted_expense_ids: deletedExpenseIds,
    };

    setSubmitting(true);
    try {
      const res = isEdit
        ? await patchJson(`/api/production-orders/${recordId}/`, payload)
        : await postJson('/api/production-orders/', payload);
      message.success(isEdit ? 'Production order updated' : 'Production order created');
      const id = res?.data?.id ?? recordId;
      if (id) router.visit(route('inventory.production-orders.show', id));
      else router.visit(route('inventory.production-orders.index'));
    } catch (e) { setTopError(applyServerErrors(e, form)); }
    finally { setSubmitting(false); }
  };

  const matCols = [
    { title: 'Raw Material', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label"
        placeholder="Select material" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateMat(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Qty', dataIndex: 'quantity', width: 110, align: 'right',
      render: (val, row, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }}
        onChange={(v) => updateMat(idx, { quantity: v ?? 0, total_cost: (v ?? 0) * toNumber(row.unit_cost) })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 80,
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateMat(idx, { unit_code: e.target.value })} placeholder="PCS" /> },
    { title: 'Unit Cost', dataIndex: 'unit_cost', width: 120, align: 'right',
      render: (val, row, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }}
        onChange={(v) => updateMat(idx, { unit_cost: v ?? 0, total_cost: toNumber(row.quantity) * (v ?? 0) })} /> },
    { title: 'Total Cost', dataIndex: 'total_cost', width: 130, align: 'right',
      render: (val, row) => fmtNum(val || toNumber(row.quantity) * toNumber(row.unit_cost)) },
    { title: 'Notes', dataIndex: 'notes',
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateMat(idx, { notes: e.target.value })} placeholder="Optional" /> },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMat(idx)} disabled={materials.length <= 1} /> },
  ];

  const byProductCols = [
    { title: 'By-product', dataIndex: 'product_id', render: (val, row, idx) => (
      <BackendSelect value={val} detailValue={row.product_detail} fkUrl="/api/products/search" labelKey="label"
        placeholder="Select product" variant="borderless" style={{ width: '100%' }}
        onChange={(v, raw) => updateByProduct(idx, { product_id: v, product_detail: raw })} />
    ) },
    { title: 'Cost %', dataIndex: 'cost_share_percent', width: 100, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} max={100} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { cost_share_percent: v ?? 0 })} /> },
    { title: 'Qty', dataIndex: 'quantity', width: 100, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateByProduct(idx, { quantity: v ?? 0 })} /> },
    { title: 'Unit', dataIndex: 'unit_code', width: 80,
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateByProduct(idx, { unit_code: e.target.value })} /> },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeByProduct(idx)} /> },
  ];

  const expenseCols = [
    { title: 'Expense Name', dataIndex: 'name',
      render: (val, _, idx) => <Input variant="borderless" value={val} onChange={(e) => updateExpense(idx, { name: e.target.value })} placeholder="Expense name" /> },
    { title: 'Account', dataIndex: 'expense_account_id', width: 200,
      render: (val, row, idx) => (
        <BackendSelect value={val} detailValue={row.expense_account_detail} fkUrl="/api/chart-of-accounts/"
          labelKey="account_name" placeholder="Optional" variant="borderless" style={{ width: '100%' }}
          onChange={(v, raw) => updateExpense(idx, { expense_account_id: v, expense_account_detail: raw })} />
      ) },
    { title: 'Amount', dataIndex: 'amount', width: 140, align: 'right',
      render: (val, _, idx) => <InputNumber variant="borderless" value={val} min={0} style={{ width: '100%' }} onChange={(v) => updateExpense(idx, { amount: v ?? 0 })} /> },
    { title: '', key: 'remove', width: 50,
      render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeExpense(idx)} /> },
  ];

  return (
    <TransactionFormShell auth={props.auth}
      title={isEdit ? 'Edit Production Order' : 'New Production Order'}
      headTitle={isEdit ? 'Edit Production Order' : 'New Production Order'}
      onBack={() => router.visit(route('inventory.production-orders.index'))}
      onCancel={() => router.visit(route('inventory.production-orders.index'))}
      onSubmit={onSubmit} submitting={submitting}
      submitLabel={isEdit ? 'Update Production Order' : 'Save Production Order'}
    >
      {topError && <Alert type="error" showIcon message={topError} style={{ marginBottom: 12 }} closable onClose={() => setTopError(null)} />}
      <Form form={form} layout="vertical" requiredMark>
        <FormSection title="Production order details">
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item label="Bill of Materials (optional — load to auto-fill)">
                <Row gutter={8}>
                  <Col flex="1">
                    <BackendSelect
                      value={bomId}
                      detailValue={bomDetail}
                      fkUrl="/api/bills-of-material/"
                      labelKey="code"
                      labelFn={(r) => `${r.code || '#draft'} — ${r.product?.name || ''}`}
                      placeholder="Search BOMs"
                      extraParams={{ approved: true }}
                      onChange={(v, raw) => { setBomId(v); setBomDetail(raw); }}
                    />
                  </Col>
                  <Col>
                    <Tooltip title="Load materials from selected BOM">
                      <Button icon={<DownloadOutlined />} onClick={loadFromBom} loading={loadingBom}>
                        Load from BOM
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="PO No" name="po_no"><Input disabled /></Form.Item>
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
              <Form.Item label="Warehouse" name="warehouse_id">
                <BackendSelect fkUrl="/api/warehouses/" labelKey="name" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Output Quantity" name="output_quantity" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber min={0.0001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Unit" name="product_unit_id">
                <BackendSelect fkUrl="/api/product-units/" labelKey="name" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Reference" name="reference">
                <Input placeholder="Reference" />
              </Form.Item>
            </Col>
          </Row>
        </FormSection>

        <FormSection title="Raw materials">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={materials} columns={matCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addMat}>Add Material</Button>}
          />
        </FormSection>

        <FormSection title="By-products (optional)">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={byProducts} columns={byProductCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addByProduct}>Add By-product</Button>}
          />
        </FormSection>

        <FormSection title="Expenses (optional)">
          <Table rowKey={(r) => r._key || r.id} size="small" bordered pagination={false} dataSource={expenses} columns={expenseCols}
            footer={() => <Button icon={<PlusOutlined />} type="dashed" onClick={addExpense}>Add Expense</Button>}
          />
        </FormSection>

        <FormSection title="Cost summary">
          <Row gutter={16}>
            <Col xs={12} sm={6}><Statistic title="Raw Material Cost" value={fmtNum(totalRawCost)} /></Col>
            <Col xs={12} sm={6}><Statistic title="Expense Cost" value={fmtNum(totalExpCost)} /></Col>
            <Col xs={12} sm={6}><Statistic title="By-product Credit" value={fmtNum(totalBpCost)} /></Col>
            <Col xs={12} sm={6}><Statistic title="Estimated Total Cost" value={fmtNum(totalCost)} valueStyle={{ color: '#1677ff', fontWeight: 700 }} /></Col>
          </Row>
        </FormSection>

        <FormSection title="Description &amp; Remarks">
          <DescriptionRemarksCollapse descriptionName="notes" remarksName="remarks" />
        </FormSection>
      </Form>
    </TransactionFormShell>
  );
}
