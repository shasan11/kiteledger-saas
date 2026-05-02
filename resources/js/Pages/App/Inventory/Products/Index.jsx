import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import {
  Button,
  Col,
  Divider,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ShoppingOutlined,
  AppstoreOutlined,
  ToolOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const extractId = (value) => {
  if (!value) return null;

  if (typeof value === 'object') {
    return value.id || value.value || null;
  }

  return value;
};

const cleanText = (value) => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' ? null : v ?? null;
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;

  const num = Number(value);

  return Number.isFinite(num) ? num : fallback;
};

const normalizeVariantItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const variantLineId =
        extractId(item?.variant_line_id) ||
        extractId(item?.variantLine) ||
        extractId(item?.variant_line) ||
        item?.variantLine?.id ||
        item?.variant_line?.id;

      return {
        id: extractId(item?.id),
        variant_line_id: variantLineId,
      };
    })
    .filter((item) => item.variant_line_id);
};

const getVariantOptionsLabel = (variant) => {
  const options =
    variant?.variant_options ||
    variant?.product_variant_items ||
    variant?.productVariantItems ||
    variant?.items ||
    [];

  if (!Array.isArray(options) || options.length < 1) return '-';

  return options
    .map((item) => {
      const variantLine = item?.variantLine || item?.variant_line;
      const variantGroup = variantLine?.variant;

      const groupName =
        item?.variant_name ||
        variantGroup?.name ||
        variantLine?.variant?.name ||
        '';

      const value =
        item?.variant_line_value ||
        variantLine?.value ||
        item?.value ||
        '';

      if (!groupName && !value) return null;

      return groupName ? `${groupName}: ${value}` : value;
    })
    .filter(Boolean)
    .join(' / ');
};

const SectionTitle = ({ title }) => (
  <div style={{ marginTop: 8, marginBottom: 12 }}>
    <Text
      strong
      style={{
        fontSize: 16,
        color: '#8b96a5',
      }}
    >
      {title}
    </Text>
  </div>
);

const ProductTypeCards = ({ values, setFieldValue, readOnly }) => {
  const selected = values?.product_type || 'goods';

  const items = [
    {
      value: 'goods',
      label: 'Goods',
      icon: <AppstoreOutlined />,
    },
    {
      value: 'service',
      label: 'Services',
      icon: <ToolOutlined />,
    },
  ];

  return (
    <div>
      <Text strong>
        Type of Product <span style={{ color: '#ff4d4f' }}>*</span>
      </Text>

      <Row gutter={12} style={{ marginTop: 8 }}>
        {items.map((item) => {
          const active = selected === item.value;

          return (
            <Col xs={24} md={8} key={item.value}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  setFieldValue('product_type', item.value);

                  if (item.value === 'service') {
                    setFieldValue('track_inventory', false);
                    setFieldValue('reorder_level', 0);
                  }
                }}
                style={{
                  width: '100%',
                  height: 84,
                  border: active ? '1.5px solid #1d4ed8' : '1px solid #d9dee8',
                  background: active ? '#ffffff' : '#f1f5f9',
                  color: '#0f172a',
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 24px',
                  fontSize: 20,
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                {item.label}
              </button>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default function Products(props) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (val, record) => (
        <div>
          <Text strong>{val}</Text>
          {record?.description ? (
            <div className="text-xs text-gray-500">{record.description}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'product_type',
      key: 'product_type',
      width: 110,
      render: (val) => (
        <Tag color={val === 'service' ? 'purple' : 'blue'}>
          {val === 'service' ? 'Service' : 'Goods'}
        </Tag>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (val) => (val ? <Tag color="blue">{val}</Tag> : '-'),
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 150,
      render: (val) => val || '-',
    },
    {
      title: 'Category',
      dataIndex: 'productCategory',
      key: 'productCategory',
      width: 180,
      render: (_, record) =>
        record?.productCategory?.name ||
        record?.product_category?.name ||
        '-',
    },
    {
      title: 'Unit',
      dataIndex: 'productUnit',
      key: 'productUnit',
      width: 120,
      render: (_, record) => {
        const unit = record?.productUnit || record?.product_unit;

        return unit ? <Tag>{unit.short_name || unit.name}</Tag> : '-';
      },
    },
    {
      title: 'Tax',
      dataIndex: 'taxClass',
      key: 'taxClass',
      width: 130,
      render: (_, record) => {
        const tax = record?.taxClass || record?.tax_class;

        return tax ? <Tag color="purple">{tax.code || tax.name}</Tag> : '-';
      },
    },
    {
      title: 'Variants',
      dataIndex: 'sales_variants',
      key: 'sales_variants',
      width: 260,
      render: (_, record) => {
        const variants =
          record?.sales_variants ||
          record?.product_variants ||
          record?.productVariants ||
          [];

        if (!Array.isArray(variants) || variants.length < 1) {
          return <Tag>Default</Tag>;
        }

        return (
          <Space size={[4, 4]} wrap>
            {variants.slice(0, 3).map((variant) => {
              const label =
                variant?.option_label ||
                getVariantOptionsLabel(variant) ||
                variant?.name ||
                variant?.sku ||
                'Variant';

              return (
                <Tag key={variant.id || label} color="geekblue">
                  {label}
                </Tag>
              );
            })}

            {variants.length > 3 ? <Tag>+{variants.length - 3}</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: 'Sale Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 130,
      align: 'right',
      render: (_, record) => {
        const variants =
          record?.sales_variants ||
          record?.product_variants ||
          record?.productVariants ||
          [];

        const firstVariant = Array.isArray(variants) ? variants[0] : null;

        return firstVariant?.selling_price !== undefined &&
          firstVariant?.selling_price !== null
          ? Number(firstVariant.selling_price).toFixed(2)
          : '-';
      },
    },
    {
      title: 'Track Inv.',
      dataIndex: 'track_inventory',
      key: 'track_inventory',
      width: 110,
      align: 'center',
      render: (val, record) => (
        <Tag color={record?.product_type === 'service' ? 'default' : val ? 'cyan' : 'default'}>
          {record?.product_type === 'service' ? 'N/A' : val ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      sorter: true,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
  ];

  const fields = [
    {
      name: 'product_type',
      label: '',
      type: 'custom',
      col: 24,
      render: ({ values, setFieldValue, readOnly }) => (
        <ProductTypeCards
          values={values}
          setFieldValue={setFieldValue}
          readOnly={readOnly}
        />
      ),
    },
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      col: 24,
      placeholder: 'Name',
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      col: 12,
      placeholder: 'P0001',
    },
    {
      name: 'product_category_id',
      label: 'Category',
      type: 'fkSelect',
      required: true,
      col: 12,
      placeholder: 'Category Name',
      fkUrl: api('/api/product-categories'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'tax_class_id',
      label: 'Tax',
      type: 'fkSelect',
      col: 12,
      placeholder: 'No Vat',
      fkUrl: api('/api/tax-classes'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) =>
        row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'product_unit_id',
      label: 'Primary Unit',
      type: 'fkSelect',
      required: true,
      col: 12,
      placeholder: 'Primary Unit',
      fkUrl: api('/api/product-units'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) =>
        row?.short_name ? `${row.name} (${row.short_name})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'barcode',
      label: 'HS Code / Barcode',
      type: 'text',
      col: 12,
      placeholder: 'HS Code / Barcode',
    },
    {
      name: 'warehouse_id',
      label: 'Location',
      type: 'fkSelect',
      col: 12,
      placeholder: 'Select Location',
      fkUrl: api('/api/warehouses'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'available_for_sale',
      label: 'Available For Sale',
      type: 'switch',
      col: 8,
    },
    {
      name: 'available_for_purchase',
      label: 'Available For Purchase',
      type: 'switch',
      col: 8,
    },
    {
      name: 'active',
      label: 'Active',
      type: 'switch',
      col: 8,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      col: 24,
      rows: 3,
      placeholder: 'Optional product description',
    },
    {
      name: 'section_additional_info',
      label: '',
      type: 'custom',
      col: 24,
      render: () => (
        <>
          <Divider style={{ margin: '8px 0 14px' }} />
          <SectionTitle title="Additional Information" />
        </>
      ),
    },
    {
      name: 'sales_account_id',
      label: 'Sales Account',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select Account',
      fkUrl: api('/api/accounts'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'purchase_account_id',
      label: 'Purchase Account',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select Account',
      fkUrl: api('/api/accounts'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'sales_return_account_id',
      label: 'Sales Return Account',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select Account',
      fkUrl: api('/api/accounts'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'purchase_return_account_id',
      label: 'Purchase Return Account',
      type: 'fkSelect',
      col: 8,
      placeholder: 'Select Account',
      fkUrl: api('/api/accounts'),
      fkSearchParam: 'search',
      fkPageSize: 20,
      fkValueKey: 'id',
      fkLabelKey: 'name',
      fkLabel: (row) => row?.code ? `${row.name} (${row.code})` : row?.name || '',
      fkExtraParams: { active: true },
    },
    {
      name: 'valuation_method',
      label: 'Valuation Method',
      type: 'select',
      col: 8,
      placeholder: 'Select...',
      options: [
        { value: 'fifo', label: 'FIFO' },
        { value: 'lifo', label: 'LIFO' },
        { value: 'average', label: 'Weighted Average' },
      ],
    },
    {
      name: 'reorder_level',
      label: 'Reorder Level',
      type: 'number',
      col: 8,
      placeholder: 'Reorder Level',
      min: 0,
    },
    {
      name: 'track_inventory',
      label: 'Track Inventory',
      type: 'switch',
      col: 8,
      condition: (values) => values?.product_type !== 'service',
    },
    {
      name: 'section_variants',
      label: '',
      type: 'custom',
      col: 24,
      condition: (values) => values?.product_type !== 'service',
      render: () => (
        <>
          <Divider style={{ margin: '8px 0 14px' }} />
          <SectionTitle title="Variant Options / Sales SKUs" />
        </>
      ),
    },
    {
      name: 'product_variants',
      label: 'Sales Variants',
      type: 'objectArray',
      col: 24,
      condition: (values) => values?.product_type !== 'service',
      addButtonText: 'Add Sales Variant',
      emptyText: 'No sales variants added',
      defaultItem: {
        name: '',
        sku: '',
        product_unit_id: null,
        purchase_price: 0,
        selling_price: 0,
        active: true,
        product_variant_items: [],
      },
      columns: [
        {
          name: 'name',
          dataIndex: 'name',
          title: 'Variant Name',
          type: 'text',
          width: 180,
          placeholder: 'e.g. Red / Large',
        },
        {
          name: 'sku',
          dataIndex: 'sku',
          title: 'SKU',
          type: 'text',
          width: 160,
          placeholder: 'SKU-001',
        },
        {
          name: 'product_unit_id',
          dataIndex: 'product_unit_id',
          title: 'Sale Unit',
          type: 'fkSelect',
          width: 180,
          placeholder: 'Unit',
          fkUrl: api('/api/product-units'),
          fkSearchParam: 'search',
          fkPageSize: 20,
          fkValueKey: 'id',
          fkLabelKey: 'name',
          fkLabel: (row) =>
            row?.short_name ? `${row.name} (${row.short_name})` : row?.name || '',
          fkExtraParams: { active: true },
        },
        {
          name: 'purchase_price',
          dataIndex: 'purchase_price',
          title: 'Purchase Price',
          type: 'number',
          width: 140,
          min: 0,
          precision: 2,
        },
        {
          name: 'selling_price',
          dataIndex: 'selling_price',
          title: 'Selling Price',
          type: 'number',
          width: 140,
          min: 0,
          precision: 2,
        },
        {
          name: 'active',
          dataIndex: 'active',
          title: 'Active',
          type: 'switch',
          width: 90,
        },
        {
          name: 'product_variant_items',
          dataIndex: 'product_variant_items',
          title: 'Variant Options',
          type: 'objectArray',
          width: 360,
          addButtonText: 'Add Option',
          defaultItem: {
            variant_line_id: null,
          },
          columns: [
            {
              name: 'variant_line_id',
              dataIndex: 'variant_line_id',
              title: 'Option',
              type: 'fkSelect',
              width: 300,
              placeholder: 'Select option',
              fkUrl: api('/api/variant-lines'),
              fkSearchParam: 'search',
              fkPageSize: 50,
              fkValueKey: 'id',
              fkLabelKey: 'value',
              fkLabel: (row) => {
                const variantName =
                  row?.variant?.name ||
                  row?.variant_name ||
                  row?.variantName ||
                  '';

                return variantName
                  ? `${variantName}: ${row?.value || ''}`
                  : row?.value || '';
              },
              fkExtraParams: { active: true },
            },
          ],
        },
      ],
    },
  ];

  const validationSchema = Yup.object().shape({
    product_type: Yup.string()
      .oneOf(['goods', 'service'])
      .required('Type of product is required'),

    name: Yup.string().required('Name is required').max(180),
    code: Yup.string().nullable().max(60),
    barcode: Yup.string().nullable().max(80),
    description: Yup.string().nullable(),

    product_category_id: Yup.string().required('Category is required'),
    product_unit_id: Yup.string().required('Primary unit is required'),
    tax_class_id: Yup.string().nullable(),
    warehouse_id: Yup.string().nullable(),

    available_for_sale: Yup.boolean().nullable(),
    available_for_purchase: Yup.boolean().nullable(),
    track_inventory: Yup.boolean().nullable(),
    active: Yup.boolean().nullable(),

    sales_account_id: Yup.string().nullable(),
    purchase_account_id: Yup.string().nullable(),
    sales_return_account_id: Yup.string().nullable(),
    purchase_return_account_id: Yup.string().nullable(),

    valuation_method: Yup.string().nullable(),
    reorder_level: Yup.number().nullable().min(0),

    product_variants: Yup.array()
      .of(
        Yup.object().shape({
          id: Yup.string().nullable(),
          name: Yup.string().nullable().max(180),
          sku: Yup.string().nullable().max(80),
          product_unit_id: Yup.string().nullable(),
          purchase_price: Yup.number().nullable().min(0),
          selling_price: Yup.number().nullable().min(0),
          active: Yup.boolean().nullable(),
          product_variant_items: Yup.array()
            .of(
              Yup.object().shape({
                id: Yup.string().nullable(),
                variant_line_id: Yup.string().nullable(),
              })
            )
            .nullable(),
        })
      )
      .nullable(),
  });

  const crudInitialValues = {
    product_type: 'goods',

    name: '',
    code: 'P0001',
    barcode: '',
    description: '',

    product_category_id: null,
    product_unit_id: null,
    tax_class_id: null,
    warehouse_id: null,

    available_for_sale: true,
    available_for_purchase: true,
    track_inventory: true,
    active: true,

    sales_account_id: null,
    purchase_account_id: null,
    sales_return_account_id: null,
    purchase_return_account_id: null,

    valuation_method: null,
    reorder_level: 0,

    product_variants: [],

    deleted_variant_ids: [],
    deleted_variant_item_ids: [],
  };

  const transformPayload = (values) => {
    const p = { ...values };

    p.product_type = p.product_type || 'goods';

    p.name = cleanText(p.name);
    p.code = cleanText(p.code);
    p.barcode = cleanText(p.barcode);
    p.description = cleanText(p.description);

    p.product_category_id = extractId(p.product_category_id);
    p.product_unit_id = extractId(p.product_unit_id);
    p.tax_class_id = extractId(p.tax_class_id);
    p.warehouse_id = extractId(p.warehouse_id);

    p.sales_account_id = extractId(p.sales_account_id);
    p.purchase_account_id = extractId(p.purchase_account_id);
    p.sales_return_account_id = extractId(p.sales_return_account_id);
    p.purchase_return_account_id = extractId(p.purchase_return_account_id);

    p.valuation_method = cleanText(p.valuation_method);
    p.reorder_level = toNumber(p.reorder_level, 0);

    p.available_for_sale = Boolean(p.available_for_sale);
    p.available_for_purchase = Boolean(p.available_for_purchase);
    p.active = Boolean(p.active);

    if (p.product_type === 'service') {
      p.track_inventory = false;
      p.reorder_level = 0;
      p.variants = [];
      p.product_variants = [];
    } else {
      p.track_inventory = Boolean(p.track_inventory);

      const variantRows =
        p.product_variants ||
        p.productVariants ||
        p.variants ||
        [];

      p.variants = Array.isArray(variantRows)
        ? variantRows.map((variant) => {
            const items =
              variant?.product_variant_items ||
              variant?.productVariantItems ||
              variant?.items ||
              [];

            return {
              id: extractId(variant?.id),
              name: cleanText(variant?.name),
              sku: cleanText(variant?.sku),
              product_unit_id: extractId(
                variant?.product_unit_id ||
                  variant?.productUnit ||
                  variant?.product_unit
              ),
              purchase_price: toNumber(variant?.purchase_price, 0),
              selling_price: toNumber(variant?.selling_price, 0),
              active: variant?.active === undefined ? true : Boolean(variant.active),
              is_system_generated: Boolean(variant?.is_system_generated || false),
              user_add_id: extractId(variant?.user_add_id),
              items: normalizeVariantItems(items),
            };
          })
        : [];
    }

    p.deleted_variant_ids = Array.isArray(p.deleted_variant_ids)
      ? p.deleted_variant_ids.filter(Boolean)
      : [];

    p.deleted_variant_item_ids = Array.isArray(p.deleted_variant_item_ids)
      ? p.deleted_variant_item_ids.filter(Boolean)
      : [];

    delete p.product_variants;
    delete p.productVariants;
    delete p.sales_variants;
    delete p.sales_attributes;

    delete p.productCategory;
    delete p.product_category;
    delete p.productUnit;
    delete p.product_unit;
    delete p.taxClass;
    delete p.tax_class;
    delete p.branch;

    delete p.branch_id_detail;
    delete p.product_category_id_detail;
    delete p.product_unit_id_detail;
    delete p.tax_class_id_detail;
    delete p.warehouse_id_detail;
    delete p.sales_account_id_detail;
    delete p.purchase_account_id_detail;
    delete p.sales_return_account_id_detail;
    delete p.purchase_return_account_id_detail;

    delete p.section_additional_info;
    delete p.section_variants;

    delete p.created_at;
    delete p.updated_at;
    delete p.deleted_at;

    Object.keys(p).forEach((key) => {
      if (p[key] === '') {
        p[key] = null;
      }
    });

    return p;
  };

  return (
    <AuthenticatedLayout
      user={props.auth?.user}
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Products
        </h2>
      }
    >
      <Head title="Products" />

      <ReusableCrud
        icon={<ShoppingOutlined />}
        title="Products"
        apiUrl={api('/api/products')}
        columns={columns}
        fields={fields}
        validationSchema={validationSchema}
        crudInitialValues={crudInitialValues}
        transformPayload={transformPayload}
        form_ui="drawer"
        drawerWidth={1280}
        searchParam="search"
        pageParam="page"
        pageSizeParam="page_size"
        sortMode="ordering"
        orderingParam="ordering"
        activeParam="active"
        enableServerPagination={true}
        enableInactiveDrawer={true}
        showSearch={true}
        canAdd={true}
        canEdit={true}
        canDelete={true}
        hasActions={true}
        hasActionColumns={true}
        anchorFilters={[
          {
            key: 'all',
            label: 'All Products',
            title: 'Products',
            params: {},
          },
          {
            key: 'track',
            label: 'Tracked Inventory',
            title: 'Products',
            params: { track_inventory: true },
          },
          {
            key: 'services',
            label: 'Services',
            title: 'Products',
            params: { product_type: 'service' },
          },
        ]}
        defaultAnchorKey="all"
        anchorSyncWithHash
      />
    </AuthenticatedLayout>
  );
}