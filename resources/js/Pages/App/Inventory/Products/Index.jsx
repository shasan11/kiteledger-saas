import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const { Text, Title } = Typography;

const emptyProduct = {
  name: '',
  code: '',
  sku: '',
  barcode: '',
  product_type: 'simple',
  product_category_id: null,
  product_unit_id: null,
  tax_class_id: null,
  sales_account_id: null,
  purchase_account_id: null,
  purchase_price: 0,
  selling_price: 0,
  reorder_level: 0,
  track_inventory: true,
  allow_sale: true,
  allow_purchase: true,
  active: true,
  description: '',
};

const emptyQuickAdd = {
  name: '',
  code: '',
  symbol: '',
  rate: 0,
  values: '',
};

const getApiError = (error, fallback = 'Something went wrong.') => {
  const data = error?.response?.data;

  if (data?.message) return data.message;

  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const firstError = data.errors[firstKey];

    if (Array.isArray(firstError)) return firstError[0];
    if (typeof firstError === 'string') return firstError;
  }

  if (error?.message) return error.message;

  return fallback;
};

const money = (value) =>
  Number(value || 0).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value.id ?? value.value ?? null;
  return value;
};

const buildSignature = (ids = []) =>
  [...new Set(ids.filter(Boolean).map(String))].sort().join('|');

const cartesian = (groups = []) =>
  groups.reduce((carry, group) => {
    const ids = group.variant_line_ids || [];
    const next = [];

    carry.forEach((prefix) => {
      ids.forEach((id) => next.push([...prefix, id]));
    });

    return next;
  }, [[]]);

const slugCode = (value = '') =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const productTypeTag = (type) => {
  const meta =
    {
      simple: ['Simple', 'blue'],
      variant_parent: ['Variant Parent', 'purple'],
      variant: ['Variant', 'green'],
    }[type || 'simple'] || ['Simple', 'blue'];

  return <Tag color={meta[1]}>{meta[0]}</Tag>;
};

export default function Products({ auth }) {
  const { token } = theme.useToken();

  const [form] = Form.useForm();
  const [quickForm] = Form.useForm();

  const [activeTab, setActiveTab] = useState('catalog');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optionLoading, setOptionLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(0);

  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [options, setOptions] = useState({
    categories: [],
    units: [],
    taxClasses: [],
    accounts: [],
    variants: [],
  });

  const [variantGroups, setVariantGroups] = useState([]);
  const [variantChildren, setVariantChildren] = useState([]);

  const [quickAdd, setQuickAdd] = useState({
    open: false,
    type: null,
    title: '',
    endpoint: '',
    targetField: null,
  });

  const selectedProductType = Form.useWatch('product_type', form) || 'simple';
  const watchedName = Form.useWatch('name', form);
  const watchedSku = Form.useWatch('sku', form);
  const watchedCode = Form.useWatch('code', form);
  const watchedPurchasePrice = Form.useWatch('purchase_price', form);
  const watchedSellingPrice = Form.useWatch('selling_price', form);

  const isVariantParent = selectedProductType === 'variant_parent';

  const variantLineMap = useMemo(() => {
    const map = {};

    options.variants.forEach((variant) => {
      (variant.variant_lines || variant.variantLines || []).forEach((line) => {
        map[line.id] = { ...line, variant };
      });
    });

    return map;
  }, [options.variants]);

  const categoryOptions = useMemo(
    () => options.categories.map((x) => ({ value: x.id, label: x.name })),
    [options.categories],
  );

  const unitOptions = useMemo(
    () => options.units.map((x) => ({ value: x.id, label: x.name || x.symbol || x.code })),
    [options.units],
  );

  const taxClassOptions = useMemo(
    () => options.taxClasses.map((x) => ({ value: x.id, label: x.name })),
    [options.taxClasses],
  );

  const accountOptions = useMemo(
    () => options.accounts.map((x) => ({ value: x.id, label: `${x.code ? `${x.code} - ` : ''}${x.name}` })),
    [options.accounts],
  );

  const variantOptions = useMemo(
    () => options.variants.map((x) => ({ value: x.id, label: x.name })),
    [options.variants],
  );

  const totalChildren = variantChildren.length;
  const activeChildren = variantChildren.filter((child) => child.active !== false).length;

  const marginEstimate = Number(watchedSellingPrice || 0) - Number(watchedPurchasePrice || 0);

  const canMoveNextFromBasic = () => {
    const values = form.getFieldsValue();

    if (!values.name) return false;
    if (!values.product_type) return false;

    return true;
  };

  const loadOptions = async () => {
    setOptionLoading(true);

    try {
      const [categories, units, taxClasses, accounts, variants] = await Promise.all([
        axios.get(api('/api/product-categories/'), {
          params: { page_size: 100, ordering: 'name' },
        }),
        axios.get(api('/api/product-units/'), {
          params: { page_size: 100, ordering: 'name' },
        }),
        axios.get(api('/api/tax-classes/'), {
          params: { page_size: 100, ordering: 'name' },
        }),
        axios.get(api('/api/accounts/'), {
          params: { page_size: 100, ordering: 'name' },
        }),
        axios.get(api('/api/variants/'), {
          params: { page_size: 100, ordering: 'sort_order' },
        }),
      ]);

      setOptions({
        categories: categories.data?.results || categories.data?.data || [],
        units: units.data?.results || units.data?.data || [],
        taxClasses: taxClasses.data?.results || taxClasses.data?.data || [],
        accounts: accounts.data?.results || accounts.data?.data || [],
        variants: variants.data?.results || variants.data?.data || [],
      });
    } catch (error) {
      message.error(getApiError(error, 'Failed to load product options.'));
    } finally {
      setOptionLoading(false);
    }
  };

  const loadRows = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);

    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        ordering: 'name',
      };

      if (activeTab === 'catalog') params.catalog = true;
      if (activeTab === 'variants') params.product_type = 'variant';

      const { data } = await axios.get(api('/api/products/'), { params });

      setRows(data.results || data.data || []);
      setPagination({
        current: page,
        pageSize,
        total: data.count || data.total || 0,
      });
    } catch (error) {
      message.error(getApiError(error, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadRows(1);
  }, [activeTab]);

  const resetBuilder = () => {
    setEditing(null);
    setStep(0);
    setVariantGroups([]);
    setVariantChildren([]);
    form.setFieldsValue(emptyProduct);
  };

  const openCreate = () => {
    resetBuilder();
    setDrawerOpen(true);
  };

  const openEdit = async (record) => {
    setSaving(true);

    try {
      const { data } = await axios.get(api(`/api/products/${record.id}`));

      setEditing(data);
      setStep(0);

      form.setFieldsValue({
        ...emptyProduct,
        ...data,
        product_category_id: data.product_category_id || data.product_category?.id,
        product_unit_id: data.product_unit_id || data.product_unit?.id,
        tax_class_id: data.tax_class_id || data.tax_class?.id,
        sales_account_id: data.sales_account_id || data.sales_account?.id,
        purchase_account_id: data.purchase_account_id || data.purchase_account?.id,
      });

      const children = data.children || [];
      const grouped = {};

      children.forEach((child) => {
        (child.variant_options || []).forEach((option) => {
          if (!grouped[option.variant_id]) {
            grouped[option.variant_id] = new Set();
          }

          grouped[option.variant_id].add(option.variant_line_id);
        });
      });

      setVariantGroups(
        Object.entries(grouped).map(([variantId, ids]) => ({
          variant_id: variantId,
          variant_line_ids: Array.from(ids),
        })),
      );

      setVariantChildren(
        children.map((child) => ({
          id: child.id,
          variant_line_ids: (child.variant_options || []).map((option) => option.variant_line_id),
          sku: child.sku,
          barcode: child.barcode,
          purchase_price: Number(child.purchase_price || 0),
          selling_price: Number(child.selling_price || 0),
          reorder_level: Number(child.reorder_level || 0),
          track_inventory: child.track_inventory !== false,
          allow_sale: child.allow_sale !== false,
          allow_purchase: child.allow_purchase !== false,
          active: child.active !== false,
        })),
      );

      setDrawerOpen(true);
    } catch (error) {
      message.error(getApiError(error, 'Failed to open product.'));
    } finally {
      setSaving(false);
    }
  };

  const autoFillCodeAndSku = () => {
    const values = form.getFieldsValue();
    const base = slugCode(values.name || 'PRODUCT');

    form.setFieldsValue({
      code: values.code || base,
      sku: values.sku || base,
    });
  };

  const quickPriceFill = (mode) => {
    const values = form.getFieldsValue();
    const purchase = Number(values.purchase_price || 0);

    if (mode === 'same') {
      form.setFieldsValue({ selling_price: purchase });
      return;
    }

    if (mode === 'margin20') {
      form.setFieldsValue({ selling_price: Number((purchase * 1.2).toFixed(2)) });
      return;
    }

    if (mode === 'margin30') {
      form.setFieldsValue({ selling_price: Number((purchase * 1.3).toFixed(2)) });
    }
  };

  const openQuickAdd = (type) => {
    const config = {
      category: {
        title: 'Quick Add Category',
        endpoint: '/api/product-categories/',
        targetField: 'product_category_id',
      },
      unit: {
        title: 'Quick Add Unit',
        endpoint: '/api/product-units/',
        targetField: 'product_unit_id',
      },
      taxClass: {
        title: 'Quick Add Tax Class',
        endpoint: '/api/tax-classes/',
        targetField: 'tax_class_id',
      },
      salesAccount: {
        title: 'Quick Add Sales Account',
        endpoint: '/api/accounts/',
        targetField: 'sales_account_id',
      },
      purchaseAccount: {
        title: 'Quick Add Purchase Account',
        endpoint: '/api/accounts/',
        targetField: 'purchase_account_id',
      },
      variant: {
        title: 'Quick Add Variant Group',
        endpoint: '/api/variants/',
        targetField: null,
      },
    }[type];

    quickForm.setFieldsValue(emptyQuickAdd);
    setQuickAdd({ open: true, type, ...config });
  };

  const submitQuickAdd = async () => {
    const values = await quickForm.validateFields();

    let payload = {
      name: values.name,
      code: values.code || slugCode(values.name),
      active: true,
    };

    if (quickAdd.type === 'unit') {
      payload = {
        ...payload,
        symbol: values.symbol || values.code || slugCode(values.name),
      };
    }

    if (quickAdd.type === 'taxClass') {
      payload = {
        ...payload,
        rate: Number(values.rate || 0),
      };
    }

    if (['salesAccount', 'purchaseAccount'].includes(quickAdd.type)) {
      payload = {
        ...payload,
        nature: 'coa',
        is_system_generated: false,
      };
    }

    if (quickAdd.type === 'variant') {
      const lines = String(values.values || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      payload = {
        ...payload,
        sort_order: 0,
        variant_lines: lines.map((value, index) => ({
          value,
          sort_order: index + 1,
          active: true,
        })),
      };
    }

    setSaving(true);

    try {
      const { data } = await axios.post(api(quickAdd.endpoint), payload);

      await loadOptions();

      if (quickAdd.targetField && data?.id) {
        form.setFieldsValue({
          [quickAdd.targetField]: data.id,
        });
      }

      if (quickAdd.type === 'variant' && data?.id) {
        setVariantGroups((current) => [
          ...current,
          {
            variant_id: data.id,
            variant_line_ids: [],
          },
        ]);
      }

      setQuickAdd((current) => ({ ...current, open: false }));
      message.success(`${values.name} added.`);
    } catch (error) {
      message.error(getApiError(error, 'Failed to add item.'));
    } finally {
      setSaving(false);
    }
  };

  const addVariantGroup = () => {
    setVariantGroups((current) => [
      ...current,
      {
        variant_id: null,
        variant_line_ids: [],
      },
    ]);
  };

  const updateVariantGroup = (index, patch) => {
    setVariantGroups((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  };

  const removeVariantGroup = (index) => {
    setVariantGroups((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const generateChildren = (missingOnly = false) => {
    const product = form.getFieldsValue();
    const validGroups = variantGroups.filter(
      (group) => group.variant_id && group.variant_line_ids?.length,
    );
    const combinations = cartesian(validGroups);

    if (!isVariantParent) {
      message.warning('Change product type to Variant Product first.');
      return;
    }

    if (!validGroups.length || !combinations.length) {
      message.warning('Select at least one variant group and value.');
      return;
    }

    const existingBySignature = Object.fromEntries(
      variantChildren.map((child) => [buildSignature(child.variant_line_ids), child]),
    );

    const next = combinations.map((ids) => {
      const signature = buildSignature(ids);
      const existing = existingBySignature[signature];

      if (missingOnly && existing) return existing;

      const values = ids.map((id) => variantLineMap[id]?.value).filter(Boolean);
      const suffix = values
        .map((value) => String(value).toUpperCase().replace(/\s+/g, '-'))
        .join('-');

      const baseSku =
        product.sku ||
        product.code ||
        String(product.name || 'PRODUCT')
          .toUpperCase()
          .replace(/\s+/g, '-');

      return {
        ...(existing || {}),
        variant_line_ids: ids,
        sku: existing?.sku || `${baseSku}-${suffix}`.slice(0, 80),
        barcode: existing?.barcode || '',
        purchase_price: existing?.purchase_price ?? Number(product.purchase_price || 0),
        selling_price: existing?.selling_price ?? Number(product.selling_price || 0),
        reorder_level: existing?.reorder_level ?? Number(product.reorder_level || 0),
        track_inventory: existing?.track_inventory ?? product.track_inventory !== false,
        allow_sale: existing?.allow_sale ?? product.allow_sale !== false,
        allow_purchase: existing?.allow_purchase ?? product.allow_purchase !== false,
        active: existing?.active ?? true,
      };
    });

    setVariantChildren(next);
    setStep(3);
    message.success(`${next.length} child variant${next.length === 1 ? '' : 's'} ready.`);
  };

  const deactivateRemoved = () => {
    const signatures = new Set(cartesian(variantGroups).map(buildSignature));

    setVariantChildren((current) =>
      current.map((child) =>
        signatures.has(buildSignature(child.variant_line_ids))
          ? child
          : {
              ...child,
              active: false,
            },
      ),
    );

    message.success('Removed combinations marked inactive.');
  };

  const updateChild = (index, patch) => {
    setVariantChildren((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  };

  const bulkApplyToChildren = () => {
    const values = form.getFieldsValue();

    setVariantChildren((current) =>
      current.map((row) => ({
        ...row,
        purchase_price: Number(values.purchase_price || 0),
        selling_price: Number(values.selling_price || 0),
        reorder_level: Number(values.reorder_level || 0),
        track_inventory: values.track_inventory !== false,
        allow_sale: values.allow_sale !== false,
        allow_purchase: values.allow_purchase !== false,
      })),
    );

    message.success('Parent pricing/settings applied to child variants.');
  };

  const buildPayload = async () => {
    const values = await form.validateFields();

    const parentIsVariant = values.product_type === 'variant_parent';

    if (parentIsVariant && !variantChildren.length) {
      throw new Error('Generate at least one child variant before saving.');
    }

    return {
      ...values,
      product_category_id: idOf(values.product_category_id),
      product_unit_id: idOf(values.product_unit_id),
      tax_class_id: idOf(values.tax_class_id),
      sales_account_id: idOf(values.sales_account_id),
      purchase_account_id: idOf(values.purchase_account_id),
      parent_id: null,
      track_inventory: parentIsVariant ? false : values.track_inventory !== false,
      allow_sale: parentIsVariant ? false : values.allow_sale !== false,
      allow_purchase: parentIsVariant ? false : values.allow_purchase !== false,
      active: values.active !== false,
      variant_groups: parentIsVariant ? variantGroups : [],
      variant_children: parentIsVariant ? variantChildren : [],
    };
  };

  const saveProduct = async (mode = 'close') => {
    setSaving(true);

    try {
      const payload = await buildPayload();

      if (editing?.id) {
        await axios.patch(api(`/api/products/${editing.id}`), payload);
      } else {
        await axios.post(api('/api/products/'), payload);
      }

      message.success('Product saved.');

      if (mode === 'new') {
        resetBuilder();
      } else {
        setDrawerOpen(false);
      }

      await loadRows(1);
    } catch (error) {
      message.error(getApiError(error, error.message || 'Unable to save product.'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space wrap>
            <Text strong>{record.name}</Text>
            {productTypeTag(record.product_type)}
            {record.active === false ? <Tag color="red">Inactive</Tag> : null}
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {[record.sku, record.barcode].filter(Boolean).join(' | ') || record.code || '-'}
          </Text>

          {record.product_type === 'variant' ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.variant_label}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) => record.product_category?.name || record.product_category_name || '-',
    },
    {
      title: 'Stock',
      key: 'stock',
      align: 'right',
      render: (_, record) =>
        record.track_inventory === false ? (
          <Tag>Not tracked</Tag>
        ) : (
          Number(record.stock_summary?.qty_on_hand || 0).toLocaleString()
        ),
    },
    {
      title: 'Children',
      key: 'children',
      align: 'center',
      render: (_, record) =>
        record.product_type === 'variant_parent' ? <Tag>{record.children_count || 0}</Tag> : '-',
    },
    {
      title: 'Purchase',
      dataIndex: 'purchase_price',
      align: 'right',
      render: money,
    },
    {
      title: 'Selling',
      dataIndex: 'selling_price',
      align: 'right',
      render: money,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 230,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              openEdit(record);
            }}
          >
            Edit
          </Button>

          {record.product_type === 'variant_parent' ? (
            <Button
              size="small"
              icon={<BranchesOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(record).then(() => setStep(1));
              }}
            >
              Variants
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const childColumns = [
    {
      title: 'Variant',
      width: 260,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>
            {form.getFieldValue('name') || 'Product'} -{' '}
            {row.variant_line_ids
              .map((id) => variantLineMap[id]?.value)
              .filter(Boolean)
              .join(' / ')}
          </Text>

          <Space wrap>
            {row.variant_line_ids.map((id) => {
              const line = variantLineMap[id];

              return (
                <Tag key={id}>
                  {line?.variant?.name}: {line?.value}
                </Tag>
              );
            })}
          </Space>
        </Space>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 180,
      render: (_, row, index) => (
        <Input value={row.sku} onChange={(e) => updateChild(index, { sku: e.target.value })} />
      ),
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      width: 180,
      render: (_, row, index) => (
        <Input
          value={row.barcode}
          onChange={(e) => updateChild(index, { barcode: e.target.value })}
        />
      ),
    },
    {
      title: 'Purchase',
      dataIndex: 'purchase_price',
      width: 120,
      render: (_, row, index) => (
        <InputNumber
          min={0}
          value={row.purchase_price}
          onChange={(v) => updateChild(index, { purchase_price: v || 0 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Selling',
      dataIndex: 'selling_price',
      width: 120,
      render: (_, row, index) => (
        <InputNumber
          min={0}
          value={row.selling_price}
          onChange={(v) => updateChild(index, { selling_price: v || 0 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Reorder',
      dataIndex: 'reorder_level',
      width: 110,
      render: (_, row, index) => (
        <InputNumber
          min={0}
          value={row.reorder_level}
          onChange={(v) => updateChild(index, { reorder_level: v || 0 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Track',
      dataIndex: 'track_inventory',
      width: 80,
      render: (_, row, index) => (
        <Switch
          checked={row.track_inventory}
          onChange={(v) => updateChild(index, { track_inventory: v })}
        />
      ),
    },
    {
      title: 'Sale',
      dataIndex: 'allow_sale',
      width: 70,
      render: (_, row, index) => (
        <Switch checked={row.allow_sale} onChange={(v) => updateChild(index, { allow_sale: v })} />
      ),
    },
    {
      title: 'Purchase',
      dataIndex: 'allow_purchase',
      width: 90,
      render: (_, row, index) => (
        <Switch
          checked={row.allow_purchase}
          onChange={(v) => updateChild(index, { allow_purchase: v })}
        />
      ),
    },
    {
      title: 'Active',
      dataIndex: 'active',
      width: 80,
      render: (_, row, index) => (
        <Switch checked={row.active} onChange={(v) => updateChild(index, { active: v })} />
      ),
    },
  ];

  const quickFieldButton = (type, title) => (
    <Button size="small" icon={<PlusOutlined />} onClick={() => openQuickAdd(type)}>
      {title}
    </Button>
  );

  const stepItems = [
    {
      title: 'Basic',
      description: 'Name & type',
    },
    {
      title: 'Variants',
      description: isVariantParent ? 'Groups' : 'Simple product',
      disabled: !isVariantParent,
    },
    {
      title: 'Generate',
      description: isVariantParent ? 'Create children' : 'Not needed',
      disabled: !isVariantParent,
    },
    {
      title: 'Children',
      description: isVariantParent ? `${activeChildren}/${totalChildren} active` : 'Not needed',
      disabled: !isVariantParent,
    },
  ];

  const quickSelect = ({
    name,
    label,
    options: selectOptions,
    quickType,
    quickLabel = 'Add',
    required = false,
  }) => (
    <Form.Item
      name={name}
      label={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{label}</span>
          {quickType ? quickFieldButton(quickType, quickLabel) : null}
        </Space>
      }
      rules={required ? [{ required: true, message: `${label} is required.` }] : []}
    >
      <Select
        allowClear
        showSearch
        loading={optionLoading}
        optionFilterProp="label"
        options={selectOptions}
        placeholder={`Select ${label.toLowerCase()}`}
      />
    </Form.Item>
  );

  return (
    <AuthenticatedLayout auth={auth}>
      <Head title="Products" />

      <div
        style={{
          background: token.colorBgLayout,
          minHeight: '100vh',
          padding: 16,
        }}
      >
        <Card
          bordered={false}
          style={{
            marginBottom: 12,
            borderRadius: token.borderRadiusLG,
          }}
          bodyStyle={{ padding: 16 }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size={0}>
                <Space>
                  <AppstoreOutlined />
                  <Title level={4} style={{ margin: 0 }}>
                    Products
                  </Title>
                </Space>
                <Text type="secondary">
                  Manage simple products, variant products, prices, stock settings, and barcodes.
                </Text>
              </Space>
            </Col>

            <Col>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search product, SKU, barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onPressEnter={() => loadRows(1)}
                style={{ width: 280 }}
              />
            </Col>

            <Col>
              <Button icon={<SearchOutlined />} onClick={() => loadRows(1)}>
                Search
              </Button>
            </Col>

            <Col>
              <Button icon={<ReloadOutlined />} onClick={() => loadRows(1)}>
                Refresh
              </Button>
            </Col>

            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                New Product
              </Button>
            </Col>
          </Row>
        </Card>

        <Card
          bordered={false}
          style={{ borderRadius: token.borderRadiusLG }}
          bodyStyle={{ padding: 16 }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'catalog',
                label: 'Catalog',
              },
              {
                key: 'variants',
                label: 'Child Variants',
              },
              {
                key: 'all',
                label: 'All Products',
              },
            ]}
          />

          <Table
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `${total} product${total === 1 ? '' : 's'}`,
            }}
            onChange={(pager) => loadRows(pager.current, pager.pageSize)}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  description="No products found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Add Product
                  </Button>
                </Empty>
              ),
            }}
            onRow={(record) => ({
              onClick: () => router.visit(route('inventory.products.show', record.id)),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>

        <Drawer
          title={
            <Space direction="vertical" size={0}>
              <Text strong>{editing ? 'Edit Product' : 'New Product'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isVariantParent
                  ? 'Create a parent product and generate child variants.'
                  : 'Create a normal saleable/purchasable product.'}
              </Text>
            </Space>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={1120}
          destroyOnClose={false}
          extra={
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>

              {!editing ? (
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={saving}
                  onClick={() => saveProduct('new')}
                >
                  Save & New
                </Button>
              ) : null}

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => saveProduct('close')}
              >
                Save Product
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col xs={24} lg={6}>
              <Card
                size="small"
                bordered={false}
                style={{
                  background: token.colorFillAlter,
                  borderRadius: token.borderRadiusLG,
                  marginBottom: 12,
                }}
              >
                <Steps
                  direction="vertical"
                  current={step}
                  onChange={(nextStep) => {
                    if (nextStep > 0 && !canMoveNextFromBasic()) {
                      message.warning('Enter product name and type first.');
                      return;
                    }

                    setStep(nextStep);
                  }}
                  items={stepItems}
                />
              </Card>

              <Card size="small" title="Quick Summary">
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text>
                    Type:{' '}
                    <Text strong>
                      {isVariantParent ? 'Variant Product' : 'Simple Product'}
                    </Text>
                  </Text>

                  <Text>
                    SKU:{' '}
                    <Text strong>
                      {watchedSku || watchedCode || slugCode(watchedName) || '-'}
                    </Text>
                  </Text>

                  <Text>
                    Purchase:{' '}
                    <Text strong>Rs. {money(watchedPurchasePrice)}</Text>
                  </Text>

                  <Text>
                    Selling:{' '}
                    <Text strong>Rs. {money(watchedSellingPrice)}</Text>
                  </Text>

                  <Text>
                    Margin:{' '}
                    <Text strong type={marginEstimate < 0 ? 'danger' : undefined}>
                      Rs. {money(marginEstimate)}
                    </Text>
                  </Text>

                  {isVariantParent ? (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Text>
                        Variant Groups: <Text strong>{variantGroups.length}</Text>
                      </Text>
                      <Text>
                        Children: <Text strong>{activeChildren}</Text> active / {totalChildren}{' '}
                        total
                      </Text>
                    </>
                  ) : null}
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={18}>
              <Form
                layout="vertical"
                form={form}
                initialValues={emptyProduct}
                onValuesChange={(changedValues) => {
                  if (
                    Object.prototype.hasOwnProperty.call(changedValues, 'product_type') &&
                    changedValues.product_type === 'simple'
                  ) {
                    setStep(0);
                    setVariantGroups([]);
                    setVariantChildren([]);
                  }
                }}
              >
                {step === 0 ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Start with basic product details"
                      description="You can create category, unit, tax, and accounts directly from this form using quick add buttons."
                    />

                    <Card
                      size="small"
                      title="Basic Information"
                      extra={
                        <Button size="small" icon={<ThunderboltOutlined />} onClick={autoFillCodeAndSku}>
                          Auto Code/SKU
                        </Button>
                      }
                    >
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item
                            name="product_type"
                            label="Product Type"
                            rules={[{ required: true, message: 'Product type is required.' }]}
                          >
                            <Select
                              options={[
                                {
                                  value: 'simple',
                                  label: 'Simple Product',
                                },
                                {
                                  value: 'variant_parent',
                                  label: 'Variant Product',
                                },
                              ]}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={16}>
                          <Form.Item
                            name="name"
                            label="Product Name"
                            rules={[{ required: true, message: 'Product name is required.' }]}
                          >
                            <Input placeholder="Example: Cotton T-Shirt" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="code" label="Code">
                            <Input placeholder="Example: TSHIRT" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="sku" label="Base SKU">
                            <Input placeholder="Example: TSHIRT-BASIC" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="barcode" label="Base Barcode">
                            <Input placeholder="Scan or enter barcode" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          {quickSelect({
                            name: 'product_category_id',
                            label: 'Category',
                            options: categoryOptions,
                            quickType: 'category',
                            quickLabel: 'New',
                          })}
                        </Col>

                        <Col xs={24} md={8}>
                          {quickSelect({
                            name: 'product_unit_id',
                            label: 'Unit',
                            options: unitOptions,
                            quickType: 'unit',
                            quickLabel: 'New',
                          })}
                        </Col>

                        <Col xs={24} md={8}>
                          {quickSelect({
                            name: 'tax_class_id',
                            label: 'Tax Class',
                            options: taxClassOptions,
                            quickType: 'taxClass',
                            quickLabel: 'New',
                          })}
                        </Col>

                        <Col span={24}>
                          <Form.Item name="description" label="Description">
                            <Input.TextArea
                              rows={3}
                              placeholder="Short product description, notes, specs, or internal detail"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    <Card size="small" title="Pricing & Stock">
                      <Row gutter={16}>
                        <Col xs={24} md={8}>
                          <Form.Item name="purchase_price" label="Purchase Price">
                            <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="selling_price" label="Selling Price">
                            <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="reorder_level" label="Reorder Level">
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>

                        <Col span={24}>
                          <Space wrap>
                            <Button size="small" onClick={() => quickPriceFill('same')}>
                              Selling = Purchase
                            </Button>
                            <Button size="small" onClick={() => quickPriceFill('margin20')}>
                              Add 20%
                            </Button>
                            <Button size="small" onClick={() => quickPriceFill('margin30')}>
                              Add 30%
                            </Button>
                          </Space>
                        </Col>

                        <Col span={24}>
                          <Divider style={{ margin: '12px 0' }} />
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item
                            name="track_inventory"
                            label="Track Inventory"
                            valuePropName="checked"
                          >
                            <Switch disabled={isVariantParent} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="allow_sale" label="Allow Sale" valuePropName="checked">
                            <Switch disabled={isVariantParent} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item
                            name="allow_purchase"
                            label="Allow Purchase"
                            valuePropName="checked"
                          >
                            <Switch disabled={isVariantParent} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="active" label="Active" valuePropName="checked">
                            <Switch />
                          </Form.Item>
                        </Col>
                      </Row>

                      {isVariantParent ? (
                        <Alert
                          type="warning"
                          showIcon
                          message="Variant parent is not directly saleable"
                          description="Stock, sale, and purchase settings will be applied to child variants instead."
                        />
                      ) : null}
                    </Card>

                    <Card size="small" title="Accounting">
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          {quickSelect({
                            name: 'sales_account_id',
                            label: 'Sales Account',
                            options: accountOptions,
                            quickType: 'salesAccount',
                            quickLabel: 'New',
                          })}
                        </Col>

                        <Col xs={24} md={12}>
                          {quickSelect({
                            name: 'purchase_account_id',
                            label: 'Purchase Account',
                            options: accountOptions,
                            quickType: 'purchaseAccount',
                            quickLabel: 'New',
                          })}
                        </Col>
                      </Row>
                    </Card>

                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>

                      {isVariantParent ? (
                        <Button
                          type="primary"
                          onClick={async () => {
                            try {
                              await form.validateFields(['name', 'product_type']);
                              setStep(1);
                            } catch {
                              message.warning('Complete required basic fields first.');
                            }
                          }}
                        >
                          Continue to Variants
                        </Button>
                      ) : (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={() => saveProduct('close')}
                        >
                          Save Product
                        </Button>
                      )}
                    </Space>
                  </Space>
                ) : null}
              </Form>

              {step === 1 ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message="Choose variant groups and values"
                    description="Example: Color = Red, Blue and Size = S, M, L will generate 6 child variants."
                  />

                  {variantGroups.length < 1 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No variant group selected"
                    >
                      <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={addVariantGroup}>
                          Add Variant Group
                        </Button>
                        <Button icon={<PlusOutlined />} onClick={() => openQuickAdd('variant')}>
                          Quick Add Variant
                        </Button>
                      </Space>
                    </Empty>
                  ) : (
                    variantGroups.map((group, index) => {
                      const variant = options.variants.find((item) => item.id === group.variant_id);
                      const lines = variant?.variant_lines || variant?.variantLines || [];

                      return (
                        <Card
                          size="small"
                          key={`${group.variant_id || 'new'}-${index}`}
                          title={`Variant Group ${index + 1}`}
                          extra={
                            <Button danger size="small" onClick={() => removeVariantGroup(index)}>
                              Remove
                            </Button>
                          }
                        >
                          <Row gutter={12}>
                            <Col xs={24} md={8}>
                              <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Variant group"
                                value={group.variant_id}
                                onChange={(value) =>
                                  updateVariantGroup(index, {
                                    variant_id: value,
                                    variant_line_ids: [],
                                  })
                                }
                                options={variantOptions}
                                style={{ width: '100%' }}
                              />
                            </Col>

                            <Col xs={24} md={16}>
                              <Select
                                mode="multiple"
                                showSearch
                                optionFilterProp="label"
                                placeholder="Select values"
                                value={group.variant_line_ids}
                                onChange={(value) =>
                                  updateVariantGroup(index, {
                                    variant_line_ids: value,
                                  })
                                }
                                options={lines.map((line) => ({
                                  value: line.id,
                                  label: line.value,
                                }))}
                                style={{ width: '100%' }}
                              />
                            </Col>
                          </Row>
                        </Card>
                      );
                    })
                  )}

                  <Space wrap>
                    <Button icon={<PlusOutlined />} onClick={addVariantGroup}>
                      Add Variant Group
                    </Button>

                    <Button icon={<PlusOutlined />} onClick={() => openQuickAdd('variant')}>
                      Quick Add Variant
                    </Button>

                    <Button
                      type="primary"
                      onClick={() => {
                        if (!variantGroups.some((group) => group.variant_id && group.variant_line_ids?.length)) {
                          message.warning('Select at least one variant group and value.');
                          return;
                        }

                        setStep(2);
                      }}
                    >
                      Continue
                    </Button>
                  </Space>
                </Space>
              ) : null}

              {step === 2 ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Alert
                    type="success"
                    showIcon
                    message="Generate child variants"
                    description="The system will create every possible combination from your selected variant values."
                  />

                  <Card>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Variant Groups</Text>
                          <div>
                            <Text strong style={{ fontSize: 22 }}>
                              {variantGroups.filter((group) => group.variant_id).length}
                            </Text>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Possible Combinations</Text>
                          <div>
                            <Text strong style={{ fontSize: 22 }}>
                              {
                                cartesian(
                                  variantGroups.filter(
                                    (group) => group.variant_id && group.variant_line_ids?.length,
                                  ),
                                ).length
                              }
                            </Text>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} md={8}>
                        <Card size="small">
                          <Text type="secondary">Already Generated</Text>
                          <div>
                            <Text strong style={{ fontSize: 22 }}>
                              {variantChildren.length}
                            </Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Card>

                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<BranchesOutlined />}
                      onClick={() => generateChildren(false)}
                    >
                      Generate Variants
                    </Button>

                    <Button onClick={() => generateChildren(true)}>
                      Regenerate Missing Only
                    </Button>

                    <Tooltip title="Marks variants inactive if they no longer match selected combinations.">
                      <Button onClick={deactivateRemoved}>Deactivate Removed</Button>
                    </Tooltip>

                    <Button onClick={() => setStep(1)}>Back</Button>
                  </Space>
                </Space>
              ) : null}

              {step === 3 ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message="Review child variants before saving"
                    description="You can edit SKU, barcode, price, stock settings, sale/purchase flags, and active status for every generated child."
                  />

                  <Card
                    size="small"
                    title={
                      <Space>
                        <BranchesOutlined />
                        <span>Child Variants</span>
                        <Tag>{activeChildren} active</Tag>
                        <Tag>{totalChildren} total</Tag>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button onClick={bulkApplyToChildren}>
                          Apply Parent Price/Settings
                        </Button>

                        <Button onClick={() => setStep(2)}>Back</Button>

                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={() => saveProduct('close')}
                        >
                          Save Product
                        </Button>
                      </Space>
                    }
                  >
                    <Table
                      rowKey={(row) => buildSignature(row.variant_line_ids)}
                      size="small"
                      columns={childColumns}
                      dataSource={variantChildren}
                      pagination={false}
                      scroll={{ x: 'max-content', y: 520 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No child variants generated"
                          >
                            <Button type="primary" onClick={() => setStep(2)}>
                              Generate Variants
                            </Button>
                          </Empty>
                        ),
                      }}
                    />
                  </Card>
                </Space>
              ) : null}
            </Col>
          </Row>
        </Drawer>

        <Modal
          title={quickAdd.title}
          open={quickAdd.open}
          onCancel={() => setQuickAdd((current) => ({ ...current, open: false }))}
          onOk={submitQuickAdd}
          confirmLoading={saving}
          okText="Add"
          destroyOnClose
        >
          <Form form={quickForm} layout="vertical" initialValues={emptyQuickAdd}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Name is required.' }]}
            >
              <Input placeholder="Enter name" />
            </Form.Item>

            <Form.Item name="code" label="Code">
              <Input placeholder="Auto-generated if empty" />
            </Form.Item>

            {quickAdd.type === 'unit' ? (
              <Form.Item name="symbol" label="Symbol">
                <Input placeholder="Example: pcs, kg, box" />
              </Form.Item>
            ) : null}

            {quickAdd.type === 'taxClass' ? (
              <Form.Item name="rate" label="Tax Rate">
                <InputNumber min={0} max={100} suffix="%" style={{ width: '100%' }} />
              </Form.Item>
            ) : null}

            {quickAdd.type === 'variant' ? (
              <Form.Item
                name="values"
                label="Variant Values"
                rules={[{ required: true, message: 'Enter at least one value.' }]}
                extra="Separate values with commas. Example: Red, Blue, Green"
              >
                <Input.TextArea rows={3} placeholder="Red, Blue, Green" />
              </Form.Item>
            ) : null}

            {['salesAccount', 'purchaseAccount'].includes(quickAdd.type) ? (
              <Alert
                type="warning"
                showIcon
                message="Quick account creation"
                description="This creates a basic account only. For proper accounting hierarchy, review it later in Chart of Accounts."
              />
            ) : null}
          </Form>
        </Modal>
      </div>
    </AuthenticatedLayout>
  );
}