import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Space, Tag, Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
  toNumber(value).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const asId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const nullIfEmpty = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

const labelize = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const productTypeColors = {
  simple: 'blue',
  variant_parent: 'purple',
  variant: 'green',
};

const productKindColors = {
  goods: 'green',
  services: 'blue',
};

const resolveProductKind = (record = {}) => {
  if (record.type_of_product) return record.type_of_product;
  if (record.track_inventory === false) return 'services';
  return 'goods';
};

const quickCategoryFields = [
  {
    name: 'name',
    label: 'Category Name',
    type: 'text',
    col: 24,
    required: true,
    placeholder: 'Category Name',
  },
  {
    name: 'parent_id',
    label: 'Parent Category',
    type: 'fkSelect',
    col: 24,
    fkUrl: api('/api/product-categories/'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    allowClear: true,
    placeholder: 'Parent Category',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    col: 24,
    rows: 2,
    placeholder: 'Description',
  },
];

const quickCategoryConfig = {
  title: 'Product Category',
  apiUrl: api('/api/product-categories/'),
  initialValues: {
    name: '',
    parent_id: null,
    description: '',
  },
  validationSchema: Yup.object({
    name: Yup.string().required('Category name is required'),
  }),
  transformPayload: (values = {}) => ({
    name: nullIfEmpty(values.name),
    parent_id: asId(values.parent_id),
    description: nullIfEmpty(values.description),
  }),
};

const quickParentProductFields = [
  {
    name: 'type_of_product',
    label: 'Type of Product',
    type: 'radio',
    col: 24,
    required: true,
    options: [
      { value: 'goods', label: 'Goods' },
      { value: 'services', label: 'Services' },
    ],
  },
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    col: 24,
    required: true,
    placeholder: 'Product Name',
  },
  {
    name: 'code',
    label: 'Code',
    type: 'text',
    col: 12,
    placeholder: 'Code',
  },
  {
    name: 'product_category_id',
    label: 'Category',
    type: 'fkSelect',
    col: 12,
    fkUrl: api('/api/product-categories/'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    quickAdd: quickCategoryConfig,
    allowClear: true,
    placeholder: 'Category',
  },
  {
    name: 'product_unit_id',
    label: 'Primary Unit',
    type: 'fkSelect',
    col: 12,
    fkUrl: api('/api/product-units/'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    allowClear: true,
    placeholder: 'Primary Unit',
  },
  {
    name: 'selling_price',
    label: 'Selling Price',
    type: 'number',
    col: 12,
    min: 0,
    placeholder: '0.00',
  },
  {
    name: 'allow_sale',
    label: 'Available For Sale',
    type: 'switch',
    col: 12,
  },
];

const quickParentProductConfig = {
  title: 'Parent Product',
  apiUrl: api('/api/products/'),
  initialValues: {
    type_of_product: 'goods',
    name: '',
    code: '',
    product_category_id: null,
    product_unit_id: null,
    selling_price: 0,
    allow_sale: true,
  },
  validationSchema: Yup.object({
    type_of_product: Yup.string().required('Type is required'),
    name: Yup.string().required('Name is required'),
  }),
  transformPayload: (values = {}) => {
    const isService = values.type_of_product === 'services';

    return {
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),
      sku: null,
      barcode: null,
      parent_id: null,
      product_category_id: asId(values.product_category_id),
      product_unit_id: asId(values.product_unit_id),
      product_tax_category_id: null,
      tax_class_id: null,
      product_type: 'simple',
      valuation_method: 'standard',
      purchase_price: 0,
      selling_price: toNumber(values.selling_price),
      reorder_level: 0,
      track_inventory: !isService,
      allow_sale: !!values.allow_sale,
      allow_purchase: !isService,
      description: null,
    };
  },
};

export default function Products({ auth }) {
  const columns = useMemo(
    () => [
      {
        title: 'Product',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value || '-'}</Text>
            <Text type="secondary">{record?.code || record?.sku || '-'}</Text>
          </Space>
        ),
      },
      {
        title: 'Type',
        key: 'type_of_product',
        width: 120,
        render: (_, record) => {
          const kind = resolveProductKind(record);

          return (
            <Tag color={productKindColors[kind] || 'default'}>
              {labelize(kind)}
            </Tag>
          );
        },
      },
      {
        title: 'Category',
        key: 'category',
        render: (_, record) =>
          record?.product_category?.name ||
          record?.productCategory?.name ||
          record?.product_category_name ||
          record?.product_category_id_detail?.label ||
          '-',
      },
      {
        title: 'Unit',
        key: 'unit',
        width: 130,
        render: (_, record) =>
          record?.product_unit?.name ||
          record?.productUnit?.name ||
          record?.product_unit_name ||
          record?.product_unit_id_detail?.label ||
          '-',
      },
      {
        title: 'Selling Price',
        dataIndex: 'selling_price',
        key: 'selling_price',
        align: 'right',
        width: 150,
        render: (value) => money(value),
      },
      {
        title: 'Status',
        key: 'status',
        width: 130,
        render: (_, record) =>
          record?.allow_sale ? (
            <Tag color="green">For Sale</Tag>
          ) : (
            <Tag>Not For Sale</Tag>
          ),
      },
      {
        title: 'Product Type',
        dataIndex: 'product_type',
        key: 'product_type',
        width: 150,
        render: (value) =>
          value ? (
            <Tag color={productTypeColors[value] || 'default'}>
              {labelize(value)}
            </Tag>
          ) : (
            '-'
          ),
      },
    ],
    []
  );

  const fields = useMemo(
    () => [
      {
        type: 'group',
        label: '',
        col: 24,
        accordion: false,
        children: [
          {
            name: 'type_of_product',
            label: 'Type of Product',
            type: 'radio',
            col: 24,
            required: true,
            options: [
              { value: 'goods', label: 'Goods' },
              { value: 'services', label: 'Services' },
            ],
          },
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            col: 24,
            required: true,
            placeholder: 'Name',
          },
          {
            name: 'code',
            label: 'Code',
            type: 'text',
            col: 12,
            placeholder: 'Code',
          },
          {
            name: 'product_category_id',
            label: 'Category',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/product-categories/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            quickAdd: quickCategoryConfig,
            allowClear: true,
            placeholder: 'Category Name',
          },
          {
            name: 'tax_class_id',
            label: 'Tax',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/tax-classes/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
            placeholder: 'No Vat',
          },
          {
            name: 'product_unit_id',
            label: 'Primary Unit',
            type: 'fkSelect',
            col: 12,
            required: true,
            fkUrl: api('/api/product-units/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
            placeholder: 'Primary Unit',
          },
          {
            name: 'allow_sale',
            label: 'Available For Sale',
            type: 'switch',
            col: 8,
          },
        ],
      },
      {
        type: 'group',
        label: '+ Add More Details',
        col: 24,
        defaultOpen: false,
        bordered: false,
        children: [
          {
            name: 'parent_id',
            label: 'Parent Product',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/products/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            quickAdd: quickParentProductConfig,
            allowClear: true,
            placeholder: 'Parent Product',
          },
          {
            name: 'sku',
            label: 'SKU',
            type: 'text',
            col: 12,
            placeholder: 'SKU',
          },
          {
            name: 'barcode',
            label: 'Barcode',
            type: 'text',
            col: 12,
            placeholder: 'Barcode',
          },
          {
            name: 'product_tax_category_id',
            label: 'Tax Category',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/product-tax-categories/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
            placeholder: 'Tax Category',
          },
          {
            name: 'purchase_price',
            label: 'Purchase Price',
            type: 'number',
            col: 8,
            min: 0,
            placeholder: '0.00',
          },
          {
            name: 'selling_price',
            label: 'Selling Price',
            type: 'number',
            col: 8,
            min: 0,
            placeholder: '0.00',
          },
          {
            name: 'reorder_level',
            label: 'Reorder Level',
            type: 'number',
            col: 8,
            min: 0,
            placeholder: '0',
            condition: (values) => values?.type_of_product !== 'services',
          },
          {
            name: 'product_type',
            label: 'Product Structure',
            type: 'select',
            col: 8,
            options: [
              { value: 'simple', label: 'Simple' },
              { value: 'variant_parent', label: 'Variant Parent' },
              { value: 'variant', label: 'Variant' },
            ],
          },
          {
            name: 'valuation_method',
            label: 'Valuation Method',
            type: 'select',
            col: 8,
            condition: (values) => values?.type_of_product !== 'services',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'average_cost', label: 'Average Cost' },
              { value: 'first_in_first_out', label: 'FIFO' },
              { value: 'last_in_first_out', label: 'LIFO' },
            ],
          },
          {
            name: 'track_inventory',
            label: 'Track Inventory',
            type: 'switch',
            col: 8,
            condition: (values) => values?.type_of_product !== 'services',
          },
          {
            name: 'allow_purchase',
            label: 'Allow Purchase',
            type: 'switch',
            col: 8,
          },
          {
            name: 'sales_account_id',
            label: 'Sales Account',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
          },
          {
            name: 'purchase_account_id',
            label: 'Purchase Account',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
          },
          {
            name: 'sales_return_account_id',
            label: 'Sales Return Account',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
          },
          {
            name: 'purchase_return_account_id',
            label: 'Purchase Return Account',
            type: 'fkSelect',
            col: 12,
            fkUrl: api('/api/accounts/'),
            fkSearchParam: 'search',
            fkPageSize: 20,
            fkValueKey: 'id',
            fkLabelKey: 'name',
            allowClear: true,
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            col: 24,
            rows: 3,
            placeholder: 'Description',
          },
        ],
      },
    ],
    []
  );

  const validationSchema = Yup.object({
    type_of_product: Yup.string().required('Type of product is required'),
    name: Yup.string().required('Name is required'),
    product_category_id: Yup.mixed().required('Category is required'),
    product_unit_id: Yup.mixed().required('Primary unit is required'),
  });

  const crudInitialValues = useMemo(
    () => ({
      type_of_product: 'goods',
      name: '',
      code: '',
      sku: '',
      barcode: '',
      parent_id: null,
      product_category_id: null,
      product_unit_id: null,
      product_tax_category_id: null,
      tax_class_id: null,
      sales_account_id: null,
      purchase_account_id: null,
      sales_return_account_id: null,
      purchase_return_account_id: null,
      purchase_price: 0,
      selling_price: 0,
      reorder_level: 0,
      product_type: 'simple',
      valuation_method: 'standard',
      track_inventory: true,
      allow_sale: true,
      allow_purchase: true,
      description: '',
    }),
    []
  );

  const transformRecord = (record = {}) => ({
    ...record,
    type_of_product: resolveProductKind(record),
    product_type: record.product_type || 'simple',
    valuation_method: record.valuation_method || 'standard',
    track_inventory: record.track_inventory !== false,
    allow_sale: record.allow_sale !== false,
    allow_purchase: record.allow_purchase !== false,
  });

  const transformPayload = (values = {}) => {
    const isService = values.type_of_product === 'services';

    return {
      name: nullIfEmpty(values.name),
      code: nullIfEmpty(values.code),
      sku: nullIfEmpty(values.sku),
      barcode: nullIfEmpty(values.barcode),
      description: nullIfEmpty(values.description),

      parent_id: asId(values.parent_id),
      product_category_id: asId(values.product_category_id),
      product_tax_category_id: asId(values.product_tax_category_id),
      product_unit_id: asId(values.product_unit_id),
      tax_class_id: asId(values.tax_class_id),

      sales_account_id: asId(values.sales_account_id),
      purchase_account_id: asId(values.purchase_account_id),
      sales_return_account_id: asId(values.sales_return_account_id),
      purchase_return_account_id: asId(values.purchase_return_account_id),

      product_type: values.product_type || 'simple',
      valuation_method: isService ? 'standard' : values.valuation_method || 'standard',

      reorder_level: isService ? 0 : toNumber(values.reorder_level),
      purchase_price: toNumber(values.purchase_price),
      selling_price: toNumber(values.selling_price),

      track_inventory: isService ? false : !!values.track_inventory,
      allow_sale: !!values.allow_sale,
      allow_purchase: isService ? false : !!values.allow_purchase,
    };
  };

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Products" />

      <ReusableCrud
        title="Products"
        icon={<ShoppingOutlined />}
        apiUrl={api('/api/products/')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformRecord={transformRecord}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={760}
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
        activeTableRowFunction={(record) => ({
          onClick: (event) => {
            if (
              event.target.closest(
                'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger'
              )
            ) {
              return;
            }

            router.visit(route('inventory.products.show', record.id));
          },
          style: { cursor: 'pointer' },
        })}
        hasActions={true}
        hasActionColumns={true}
      />
    </AuthenticatedLayout>
  );
}