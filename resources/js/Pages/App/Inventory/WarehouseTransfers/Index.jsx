import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Tag, Typography, Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const formatDate = (value) => {
  if (!value) return null;
  const d = dayjs(value, 'DD-MM-YYYY', true);
  if (d.isValid()) return d.format('YYYY-MM-DD');
  const d2 = dayjs(value);
  return d2.isValid() ? d2.format('YYYY-MM-DD') : value;
};

const emptyLine = {
  product_id: null,
  product_id_detail: null,
  product_name: '',
  qty: 1,
  remarks: '',
};

const statusColor = (s) => {
  if (s === 'posted') return 'green';
  if (s === 'cancelled') return 'red';
  return 'default';
};

export default function WarehouseTransfers(props) {
  const columns = useMemo(() => [
    {
      title: 'Transfer No',
      dataIndex: 'transfer_no',
      key: 'transfer_no',
      sorter: true,
      render: (val) => <Text strong>{val || 'DRAFT'}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      sorter: true,
      render: (val) => {
        if (!val) return '-';
        const d = dayjs(val);
        return d.isValid() ? d.format('DD-MM-YYYY') : val;
      },
    },
    {
      title: 'From Warehouse',
      dataIndex: 'fromWarehouse',
      key: 'fromWarehouse',
      render: (_, r) => r?.fromWarehouse?.name || r?.from_warehouse?.name || '-',
    },
    {
      title: 'To Warehouse',
      dataIndex: 'toWarehouse',
      key: 'toWarehouse',
      render: (_, r) => r?.toWarehouse?.name || r?.to_warehouse?.name || '-',
    },
    {
      title: 'Items',
      dataIndex: 'warehouseTransferLines',
      key: 'items',
      align: 'right',
      render: (_, r) => (r?.warehouseTransferLines || r?.items || []).length,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val) => (
        <Tag color={statusColor(val)}>
          {val ? val.charAt(0).toUpperCase() + val.slice(1) : 'Draft'}
        </Tag>
      ),
    },
  ], []);

  const fields = useMemo(() => [
    { name: 'transfer_no', label: 'Transfer No', type: 'text', col: 8, placeholder: 'Auto draft ref if blank' },
    { name: 'transfer_date', label: 'Transfer Date', type: 'datePicker', required: true, col: 8, format: 'DD-MM-YYYY', placeholder: 'Select date' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      col: 8,
      options: [
        { value: 'draft',     label: 'Draft' },
        { value: 'posted',    label: 'Posted' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      name: 'from_warehouse_id',
      label: 'From Warehouse',
      type: 'fkSelect',
      required: true,
      col: 12,
      placeholder: 'Select source warehouse',
      fkUrl: api('/api/warehouses'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'to_warehouse_id',
      label: 'To Warehouse',
      type: 'fkSelect',
      required: true,
      col: 12,
      placeholder: 'Select destination warehouse',
      fkUrl: api('/api/warehouses'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'items',
      label: 'Transfer Lines',
      type: 'objectArray',
      col: 24,
      headerBg: '#424b59',
      headerColor: '#ffffff',
      addButtonLabel: 'Add Product',
      defaultItem: { ...emptyLine },
      columns: [
        {
          key: 'product_id',
          name: 'product_id',
          label: 'Product',
          type: 'fkSelect',
          width: '3fr',
          placeholder: 'Search product',
          fkUrl: api('/api/products'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          labelField: 'product_name',
          fkExtraParams: { active: true, track_inventory: true },
          fkLabel: (row) => {
            const name = row?.name || row?.display_name || '';
            const code = row?.code || row?.sku || '';
            return [name, code ? `(${code})` : ''].filter(Boolean).join(' ');
          },
        },
        { key: 'qty', name: 'qty', label: 'Quantity', type: 'number', width: '140px', min: 0.0001, placeholder: '0' },
        { key: 'remarks', name: 'remarks', label: 'Remarks', type: 'text', width: '2fr', placeholder: 'Optional remarks' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', col: 24, rows: 3, placeholder: 'Transfer notes' },
  ], []);

  const validationSchema = Yup.object().shape({
    transfer_no: Yup.string().nullable().max(40),
    transfer_date: Yup.string().required('Date is required'),
    from_warehouse_id: Yup.string().nullable().required('Source warehouse is required'),
    to_warehouse_id: Yup.string().nullable().required('Destination warehouse is required')
      .test('different', 'Source and destination must be different', function (val) {
        return val !== this.parent.from_warehouse_id;
      }),
    status: Yup.string().nullable().oneOf(['draft', 'posted', 'cancelled']),
    items: Yup.array()
      .of(Yup.object().shape({
        product_id: Yup.string().nullable().required('Product is required'),
        qty: Yup.number().typeError('Qty required').min(0.0001, 'Qty must be > 0').required('Qty required'),
        remarks: Yup.string().nullable(),
      }))
      .min(1, 'At least one line item is required'),
  });

  const crudInitialValues = {
    transfer_no: '',
    transfer_date: dayjs().format('YYYY-MM-DD'),
    from_warehouse_id: null,
    to_warehouse_id: null,
    status: 'draft',
    notes: '',
    items: [{ ...emptyLine }],
    deleted_item_ids: [],
  };

  const transformPayload = (values) => {
    const items = (values.items || [])
      .filter((row) => row.product_id)
      .map((row) => ({
        id: row.id,
        product_id: row.product_id,
        qty: Number(row.qty) || 0,
        remarks: row.remarks?.trim() || null,
      }));

    return {
      transfer_no: values.transfer_no?.trim() || null,
      transfer_date: formatDate(values.transfer_date),
      from_warehouse_id: values.from_warehouse_id || null,
      to_warehouse_id: values.to_warehouse_id || null,
      status: values.status || 'draft',
      notes: values.notes?.trim() || null,
      items,
      deleted_item_ids: Array.isArray(values.deleted_item_ids) ? values.deleted_item_ids : [],
    };
  };

  const renderSaveButton = ({ submitForm, isValid, isSubmitting }) => (
    <Button
      type="primary"
      loading={isSubmitting}
      disabled={!isValid || isSubmitting}
      onClick={submitForm}
      style={{ minWidth: 165, height: 52, borderRadius: 2, background: '#18b957', borderColor: '#18b957', fontWeight: 650, fontSize: 16 }}
    >
      Save Transfer
    </Button>
  );

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Warehouse Transfers</h2>}
    >
      <Head title="Warehouse Transfers" />
      <ReusableCrud
        icon={<SwapOutlined />}
        title="Warehouse Transfers"
        apiUrl={api('/api/warehouse-transfers')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        renderSubmitButton={renderSaveButton}
        form_ui="drawer"
        drawerWidth="calc(100vw - 32px)"
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        enableServerPagination={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
        anchorFilters={[
          { key: 'approved',  label: 'Approved',  title: 'Warehouse Transfers', params: { approved: true } },
          { key: 'draft',     label: 'Draft',     title: 'Warehouse Transfers', params: { approved: false } },
          { key: 'all',       label: 'All',       title: 'Warehouse Transfers', params: {} },
        ]}
        defaultAnchorKey="approved"
        anchorSyncWithHash
        showViewColumn
        viewPathBuilder={(record) => route('inventory.warehouse-transfers.show', record.id)}
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
            router.visit(route('inventory.warehouse-transfers.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
      />
    </AuthenticatedLayout>
  );
}
