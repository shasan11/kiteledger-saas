import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Radio, Select, Switch, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';


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

const taxOptions = [
    { value: 'no_vat', label: 'No Vat' },
    { value: 'vat_13', label: '13% VAT' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
];

const valuationMethodOptions = [
    { value: 'fifo', label: 'FIFO' },
    { value: 'weighted_average', label: 'Weighted Average' },
    { value: 'standard_cost', label: 'Standard Cost' },
];

const attributeOptions = [
    { value: 'size', label: 'Size' },
    { value: 'color', label: 'Color' },
    { value: 'material', label: 'Material' },
    { value: 'brand', label: 'Brand' },
    { value: 'weight', label: 'Weight' },
    { value: 'capacity', label: 'Capacity' },
];

const emptyVariant = {
    attribute_id: null,
    attribute_name: '',
    options: [],
};

const initialValues = {
    product_type: 'goods',

    name: '',
    code: '',

    category_id: null,
    category_id_detail: null,
    category_name: '',

    tax: 'no_vat',

    primary_unit_id: null,
    primary_unit_id_detail: null,
    primary_unit_name: '',

    hs_code: '',

    available_for_sale: true,

    is_variant_product: false,
    variants: [{ ...emptyVariant }],

    selling_price: 0,
    purchase_price: 0,

    show_additional_information: false,

    sales_account_id: null,
    sales_account_id_detail: null,
    sales_account_name: '',

    purchase_account_id: null,
    purchase_account_id_detail: null,
    purchase_account_name: '',

    sales_return_account_id: null,
    sales_return_account_id_detail: null,
    sales_return_account_name: '',

    purchase_return_account_id: null,
    purchase_return_account_id_detail: null,
    purchase_return_account_name: '',

    valuation_method: null,
    reorder_level: 0,

    track_inventory: true,

    description: '',
    active: true,
};

const validationSchema = Yup.object().shape({
    product_type: Yup.string().required('Product type is required'),

    name: Yup.string()
        .trim()
        .required('Name is required')
        .max(180, 'Name must be less than 180 characters'),

    code: Yup.string()
        .trim()
        .required('Code is required')
        .max(80, 'Code must be less than 80 characters'),

    category_id: Yup.string().nullable().required('Category is required'),

    primary_unit_id: Yup.string().nullable().required('Primary unit is required'),

    tax: Yup.string().nullable(),

    selling_price: Yup.number()
        .typeError('Selling price is required')
        .min(0, 'Selling price cannot be negative'),

    purchase_price: Yup.number()
        .typeError('Purchase price is required')
        .min(0, 'Purchase price cannot be negative'),

    reorder_level: Yup.number()
        .typeError('Reorder level must be a number')
        .min(0, 'Reorder level cannot be negative'),

    variants: Yup.array().when(['product_type', 'is_variant_product'], {
        is: (productType, isVariantProduct) =>
            productType === 'goods' && !!isVariantProduct,
        then: (schema) =>
            schema
                .of(
                    Yup.object().shape({
                        attribute_id: Yup.string()
                            .nullable()
                            .required('Attribute is required'),
                        options: Yup.array()
                            .of(Yup.string())
                            .min(1, 'At least one option is required'),
                    }),
                )
                .min(1, 'At least one variant attribute is required'),
        otherwise: (schema) => schema.nullable(),
    }),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: '_product_type_selector',
                label: 'Type of Product',
                type: 'custom',
                required: true,
                col: 16,
                render: ({ values, setFieldValue }) => (
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>
                            Type of Product <span style={{ color: 'red' }}>*</span>
                        </div>

                        <Radio.Group
                            value={values.product_type}
                            onChange={(e) => {
                                const value = e.target.value;

                                setFieldValue('product_type', value);

                                if (value === 'service') {
                                    setFieldValue('track_inventory', false);
                                    setFieldValue('valuation_method', null);
                                    setFieldValue('reorder_level', 0);
                                    setFieldValue('is_variant_product', false);
                                    setFieldValue('variants', []);
                                }

                                if (value === 'goods') {
                                    setFieldValue('track_inventory', true);

                                    if (!Array.isArray(values.variants) || values.variants.length === 0) {
                                        setFieldValue('variants', [{ ...emptyVariant }]);
                                    }
                                }
                            }}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 8,
                                width: '100%',
                            }}
                        >
                            <Radio.Button
                                value="goods"
                                style={{
                                    height: 52,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: 16,
                                    fontWeight: 600,
                                }}
                            >
                                Goods
                            </Radio.Button>

                            <Radio.Button
                                value="service"
                                style={{
                                    height: 52,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: 16,
                                    fontWeight: 600,
                                }}
                            >
                                Services
                            </Radio.Button>
                        </Radio.Group>
                    </div>
                ),
            },
            {
                name: '_type_empty_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: 'name',
                label: 'Name',
                required: true,
                col: 16,
                placeholder: 'Name',
            },
            {
                name: 'code',
                label: 'Code',
                required: true,
                col: 8,
                placeholder: 'Code',
            },

            {
                name: 'category_id',
                label: 'Category',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Category Name',
                fkUrl: '/api/product-categories/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'category_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) =>
                    row?.name ||
                    row?.display_name ||
                    row?.code ||
                    '',
            },
            {
                name: 'tax',
                label: 'Tax',
                type: 'select',
                col: 8,
                placeholder: 'Tax',
                options: taxOptions,
            },
            {
                name: 'primary_unit_id',
                label: 'Primary Unit',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Primary Unit',
                fkUrl: '/api/units-of-measurement/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'primary_unit_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) =>
                    row?.short_name
                        ? `${row.name || row.short_name} (${row.short_name})`
                        : row?.name || row?.display_name || row?.code || '',
            },

            {
                name: 'hs_code',
                label: 'HS Code',
                col: 8,
                placeholder: 'HS Code',
            },
            {
                name: 'available_for_sale',
                label: 'Available For Sale',
                type: 'switch',
                col: 8,
            },
            {
                name: '_hs_empty_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: '_variant_product_toggle',
                label: '',
                type: 'custom',
                col: 24,
                condition: (values) => values.product_type === 'goods',
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            marginTop: 14,
                            paddingTop: 18,
                        }}
                    >
                        <div
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e5e7eb',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: '#111827',
                                    }}
                                >
                                    Variant Product
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#6b7280',
                                        marginTop: 3,
                                    }}
                                >
                                    Enable this when the product has attributes like size, color, material, or brand
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <Text strong>
                                    {values.is_variant_product ? 'Enabled' : 'Disabled'}
                                </Text>

                                <Switch
                                    checked={!!values.is_variant_product}
                                    onChange={(checked) => {
                                        setFieldValue('is_variant_product', checked);

                                        if (checked) {
                                            const hasVariants =
                                                Array.isArray(values.variants) &&
                                                values.variants.length > 0;

                                            if (!hasVariants) {
                                                setFieldValue('variants', [{ ...emptyVariant }]);
                                            }
                                        } else {
                                            setFieldValue('variants', []);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ),
            },

            {
                name: '_variant_product_information',
                label: '',
                type: 'custom',
                col: 24,
                condition: (values) =>
                    values.product_type === 'goods' && !!values.is_variant_product,
                render: ({ values, setFieldValue }) => {
                    const variants = Array.isArray(values.variants)
                        ? values.variants
                        : [{ ...emptyVariant }];

                    const updateVariant = (index, key, value) => {
                        const next = [...variants];

                        next[index] = {
                            ...(next[index] || {}),
                            [key]: value,
                        };

                        setFieldValue('variants', next);
                    };

                    const removeVariant = (index) => {
                        const next = variants.filter((_, i) => i !== index);
                        setFieldValue('variants', next.length ? next : [{ ...emptyVariant }]);
                    };

                    const addVariant = () => {
                        setFieldValue('variants', [...variants, { ...emptyVariant }]);
                    };

                    return (
                        <div
                            style={{
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                padding: 16,
                                marginTop: 4,
                            }}
                        >
                            <div
                                style={{
                                    color: '#8b95a5',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    marginBottom: 14,
                                }}
                            >
                                Product Information
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 44px',
                                    gap: 10,
                                    alignItems: 'end',
                                    marginBottom: 8,
                                }}
                            >
                                <div style={{ fontWeight: 600 }}>
                                    Attributes <span style={{ color: 'red' }}>*</span>
                                </div>

                                <div style={{ fontWeight: 600 }}>
                                    Options
                                </div>

                                <div />
                            </div>

                            {variants.map((row, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 44px',
                                        gap: 10,
                                        alignItems: 'center',
                                        marginBottom: 10,
                                    }}
                                >
                                    <Select
                                        size="large"
                                        showSearch
                                        allowClear
                                        placeholder="Select Attributes"
                                        value={row.attribute_id || undefined}
                                        options={attributeOptions}
                                        onChange={(value, option) => {
                                            updateVariant(index, 'attribute_id', value || null);
                                            updateVariant(index, 'attribute_name', option?.label || '');
                                        }}
                                        style={{ width: '100%' }}
                                    />

                                    <Select
                                        size="large"
                                        mode="tags"
                                        allowClear
                                        placeholder="Please select"
                                        value={row.options || []}
                                        onChange={(value) => updateVariant(index, 'options', value)}
                                        style={{ width: '100%' }}
                                    />

                                    <Button
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeVariant(index)}
                                    />
                                </div>
                            ))}

                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={addVariant}
                                style={{ marginTop: 4 }}
                            >
                                Add Attribute
                            </Button>
                        </div>
                    );
                },
            },

            {
                name: '_price_separator',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            marginTop: 10,
                            paddingTop: 4,
                        }}
                    />
                ),
            },
            {
                name: 'selling_price',
                label: 'Selling Price',
                type: 'number',
                col: 12,
                min: 0,
                placeholder: '0',
            },
            {
                name: 'purchase_price',
                label: 'Purchase Price',
                type: 'number',
                col: 12,
                min: 0,
                placeholder: '0',
            },

            {
                name: '_additional_information_toggle',
                label: '',
                type: 'custom',
                col: 24,
                render: ({ values, setFieldValue }) => (
                    <div
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            marginTop: 14,
                            paddingTop: 18,
                        }}
                    >
                        <div
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e5e7eb',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: '#111827',
                                    }}
                                >
                                    Additional Information
                                </div>

                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#6b7280',
                                        marginTop: 3,
                                    }}
                                >
                                    Accounts, inventory valuation, reorder level and description
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <Text strong>
                                    {values.show_additional_information ? 'Shown' : 'Hidden'}
                                </Text>

                                <Switch
                                    checked={!!values.show_additional_information}
                                    onChange={(checked) =>
                                        setFieldValue('show_additional_information', checked)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                ),
            },

            {
                name: 'sales_account_id',
                label: 'Sales Account',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'sales_account_name',
                condition: (values) => !!values.show_additional_information,
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },
            {
                name: 'purchase_account_id',
                label: 'Purchase Account',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'purchase_account_name',
                condition: (values) => !!values.show_additional_information,
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },
            {
                name: 'sales_return_account_id',
                label: 'Sales Return Account',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'sales_return_account_name',
                condition: (values) => !!values.show_additional_information,
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },

            {
                name: 'purchase_return_account_id',
                label: 'Purchase Return Account',
                type: 'fkSelect',
                col: 8,
                placeholder: 'Select Account',
                fkUrl: '/api/accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'purchase_return_account_name',
                condition: (values) => !!values.show_additional_information,
                fkLabel: (row) =>
                    row?.display_name ||
                    row?.name ||
                    row?.code ||
                    '',
            },
            {
                name: 'valuation_method',
                label: 'Valuation Method',
                type: 'select',
                col: 8,
                placeholder: 'Select...',
                options: valuationMethodOptions,
                condition: (values) =>
                    !!values.show_additional_information &&
                    values.product_type === 'goods',
            },
            {
                name: 'reorder_level',
                label: 'Reorder Level',
                type: 'number',
                col: 8,
                min: 0,
                placeholder: 'Reorder Level',
                condition: (values) =>
                    !!values.show_additional_information &&
                    values.product_type === 'goods',
            },

            {
                name: 'track_inventory',
                label: 'Track Inventory',
                type: 'switch',
                col: 8,
                condition: (values) =>
                    !!values.show_additional_information &&
                    values.product_type === 'goods',
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                col: 16,
                rows: 3,
                placeholder: 'Description',
                condition: (values) => !!values.show_additional_information,
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: 'Code',
                dataIndex: 'code',
                key: 'code',
                width: 140,
                backendSort: true,
                sortField: 'code',
                render: (value) => <Text strong>{value || '-'}</Text>,
            },
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                width: 240,
                backendSort: true,
                sortField: 'name',
                render: (value) => <Text strong>{value || '-'}</Text>,
            },
            {
                title: 'Type',
                dataIndex: 'product_type',
                key: 'product_type',
                width: 120,
                render: (value) =>
                    value === 'service' ? (
                        <Tag color="blue">Service</Tag>
                    ) : (
                        <Tag color="green">Goods</Tag>
                    ),
            },
            {
                title: 'Category',
                dataIndex: 'category_name',
                key: 'category_name',
                width: 180,
                render: (_, record) =>
                    record?.category_name ||
                    record?.category?.name ||
                    '-',
            },
            {
                title: 'Primary Unit',
                dataIndex: 'primary_unit_name',
                key: 'primary_unit_name',
                width: 150,
                render: (_, record) =>
                    record?.primary_unit_name ||
                    record?.primary_unit?.name ||
                    record?.primary_unit?.short_name ||
                    '-',
            },
            {
                title: 'Selling Price',
                dataIndex: 'selling_price',
                key: 'selling_price',
                width: 140,
                align: 'right',
                backendSort: true,
                sortField: 'selling_price',
                render: (value) => money(value),
            },
            {
                title: 'Purchase Price',
                dataIndex: 'purchase_price',
                key: 'purchase_price',
                width: 150,
                align: 'right',
                backendSort: true,
                sortField: 'purchase_price',
                render: (value) => money(value),
            },
            {
                title: 'Variant',
                dataIndex: 'is_variant_product',
                key: 'is_variant_product',
                width: 110,
                render: (value, record) =>
                    record?.product_type === 'service' ? (
                        <Tag>Not Required</Tag>
                    ) : value ? (
                        <Tag color="purple">Variant</Tag>
                    ) : (
                        <Tag>Simple</Tag>
                    ),
            },
            {
                title: 'Sale',
                dataIndex: 'available_for_sale',
                key: 'available_for_sale',
                width: 100,
                render: (value) =>
                    value ? (
                        <Tag color="green">Yes</Tag>
                    ) : (
                        <Tag color="red">No</Tag>
                    ),
            },
            {
                title: 'Inventory',
                dataIndex: 'track_inventory',
                key: 'track_inventory',
                width: 120,
                render: (value, record) =>
                    record?.product_type === 'service' ? (
                        <Tag>Not Required</Tag>
                    ) : value ? (
                        <Tag color="green">Tracked</Tag>
                    ) : (
                        <Tag color="red">Not Tracked</Tag>
                    ),
            },
            {
                title: 'Status',
                dataIndex: 'active',
                key: 'active',
                width: 110,
                render: (value, record) => {
                    const isActive =
                        record?.active !== undefined
                            ? record.active
                            : record?.is_active !== undefined
                                ? record.is_active
                                : value;

                    return isActive ? (
                        <Tag color="green">Active</Tag>
                    ) : (
                        <Tag color="red">Inactive</Tag>
                    );
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const isService = values.product_type === 'service';
        const isVariantProduct = !isService && !!values.is_variant_product;

        return {
            product_type: values.product_type || 'goods',

            name: values.name || '',
            code: values.code || '',

            category_id: values.category_id || null,
            tax: values.tax || 'no_vat',
            primary_unit_id: values.primary_unit_id || null,

            hs_code: values.hs_code || '',

            available_for_sale: !!values.available_for_sale,

            is_variant_product: isVariantProduct,

            variants: isVariantProduct
                ? (values.variants || [])
                    .filter((row) => row.attribute_id && row.options?.length)
                    .map((row) => ({
                        attribute_id: row.attribute_id,
                        attribute_name: row.attribute_name || '',
                        options: row.options || [],
                    }))
                : [],

            selling_price: toNumber(values.selling_price),
            purchase_price: toNumber(values.purchase_price),

            sales_account_id: values.sales_account_id || null,
            purchase_account_id: values.purchase_account_id || null,
            sales_return_account_id: values.sales_return_account_id || null,
            purchase_return_account_id: values.purchase_return_account_id || null,

            valuation_method: isService ? null : values.valuation_method || null,
            reorder_level: isService ? 0 : toNumber(values.reorder_level),
            track_inventory: isService ? false : !!values.track_inventory,

            description: values.description || '',
            active: values.active !== false,
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const category = values?.category_id_detail;

        if (category) {
            const name =
                category.name ||
                category.display_name ||
                category.code ||
                '';

            if (name && values.category_name !== name) {
                setFieldValue('category_name', name, false);
            }
        }

        const unit = values?.primary_unit_id_detail;

        if (unit) {
            const name =
                unit.short_name
                    ? `${unit.name || unit.short_name} (${unit.short_name})`
                    : unit.name || unit.display_name || unit.code || '';

            if (name && values.primary_unit_name !== name) {
                setFieldValue('primary_unit_name', name, false);
            }
        }

        if (values.product_type === 'service') {
            if (values.track_inventory) {
                setFieldValue('track_inventory', false, false);
            }

            if (values.valuation_method) {
                setFieldValue('valuation_method', null, false);
            }

            if (toNumber(values.reorder_level) !== 0) {
                setFieldValue('reorder_level', 0, false);
            }

            if (values.is_variant_product) {
                setFieldValue('is_variant_product', false, false);
                setFieldValue('variants', [], false);
            }
        }

        if (
            values.product_type === 'goods' &&
            values.is_variant_product &&
            (!Array.isArray(values.variants) || values.variants.length === 0)
        ) {
            setFieldValue('variants', [{ ...emptyVariant }], false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Products
                </h2>
            }
        >
            <Head title="Products" />

            <ReusableCrud
                title="Product"
                apiUrl={api('/api/products/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth="calc(100vw - 32px)"
                modalWidth={1300}
                enableServerPagination
                pageParam="page"
                pageSizeParam="page_size"
                searchParam="search"
                activeParam="active"
                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField="name"
                defaultSortOrder="ascend"
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                anchorFilters={[
                    {
                        key: 'active',
                        label: 'Active',
                        title: 'Products',
                        params: { active: true },
                    },
                    {
                        key: 'inactive',
                        label: 'Inactive',
                        title: 'Products',
                        params: { active: false },
                    },
                    {
                        key: 'goods',
                        label: 'Goods',
                        title: 'Products',
                        params: { product_type: 'goods' },
                    },
                    {
                        key: 'services',
                        label: 'Services',
                        title: 'Products',
                        params: { product_type: 'service' },
                    },
                    {
                        key: 'variants',
                        label: 'Variants',
                        title: 'Products',
                        params: { is_variant_product: true },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Products',
                        params: {},
                    },
                ]}
                defaultAnchorKey="active"
                anchorSyncWithHash
                showSearch
                canAdd
                canEdit
                canDelete
                canView
                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}