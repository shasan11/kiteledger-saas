import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Button, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';
const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const formatDateForBackend = (value) => {
    if (!value) return null;

    const display = dayjs(value, 'DD-MM-YYYY', true);
    if (display.isValid()) return display.format('YYYY-MM-DD');

    const normal = dayjs(value);
    if (normal.isValid()) return normal.format('YYYY-MM-DD');

    return value;
};

const emptyTransferItem = {
    product_id: null,
    product_id_detail: null,
    product_name: '',
    product_code: '',
    quantity: 1,
    unit_code: '',
    notes: '',
};

const initialValues = {
    transfer_number: 'DRAFT',
    date: dayjs().format('YYYY-MM-DD'),
    reference: '',

    source_warehouse_id: null,
    source_warehouse_id_detail: null,
    source_warehouse_name: '',

    destination_warehouse_id: null,
    destination_warehouse_id_detail: null,
    destination_warehouse_name: '',

    items: [{ ...emptyTransferItem }],

    notes: '',
    approved: false,
    status: 'draft',
};

const validationSchema = Yup.object().shape({
    date: Yup.string().required('Date is required'),

    source_warehouse_id: Yup.string()
        .nullable()
        .required('Source warehouse is required'),

    destination_warehouse_id: Yup.string()
        .nullable()
        .required('Destination warehouse is required')
        .test(
            'different-warehouse',
            'Destination warehouse must be different from source warehouse',
            function (value) {
                const { source_warehouse_id } = this.parent;
                if (!value || !source_warehouse_id) return true;
                return String(value) !== String(source_warehouse_id);
            },
        ),

    items: Yup.array()
        .of(
            Yup.object().shape({
                product_id: Yup.string()
                    .nullable()
                    .required('Product is required'),

                quantity: Yup.number()
                    .typeError('Qty is required')
                    .min(0.0001, 'Qty must be greater than 0')
                    .required('Qty is required'),
            }),
        )
        .min(1, 'At least one product is required'),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'transfer_number',
                label: '#TRANSFER',
                col: 8,
                readOnly: true,
                placeholder: 'DRAFT',
            },
            {
                name: 'date',
                label: 'Date',
                type: 'datePicker',
                required: true,
                col: 8,
                format: 'DD-MM-YYYY',
                placeholder: 'Date',
            },
            {
                name: 'reference',
                label: 'Reference',
                col: 8,
                placeholder: 'Reference',
            },

            {
                name: 'source_warehouse_id',
                label: 'Source Warehouse',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Warehouse',
                fkUrl: '/api/warehouses/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'source_warehouse_name',
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
                name: 'destination_warehouse_id',
                label: 'Destination Warehouse',
                type: 'fkSelect',
                required: true,
                col: 8,
                placeholder: 'Select Warehouse',
                fkUrl: '/api/warehouses/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'destination_warehouse_name',
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
                name: '_warehouse_empty_space',
                type: 'custom',
                col: 8,
                render: () => null,
            },

            {
                name: 'items',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: 'Add Code or Product',
                defaultItem: { ...emptyTransferItem },
                columns: [
                    {
                        key: 'product_id',
                        name: 'product_id',
                        label: 'Product',
                        type: 'fkSelect',
                        width: '4fr',
                        placeholder: 'Add Code or Product',
                        fkUrl: '/api/products/',
                        fkSearchParam: 'search',
                        fkPageSize: 20,
                        fkValueKey: 'id',
                        fkLabelKey: 'name',
                        labelField: 'product_name',
                        fkExtraParams: (values) => ({
                            active: true,
                            product_type: 'goods',
                            track_inventory: true,
                            warehouse_id: values?.source_warehouse_id || '',
                        }),
                        fkLabel: (row) => {
                            const name =
                                row?.name ||
                                row?.display_name ||
                                row?.title ||
                                '';

                            const code =
                                row?.code ||
                                row?.sku ||
                                '';

                            return [name, code ? `(${code})` : '']
                                .filter(Boolean)
                                .join(' ');
                        },
                    },
                    {
                        key: 'quantity',
                        name: 'quantity',
                        label: 'Qty',
                        type: 'number',
                        width: '150px',
                        min: 0,
                        placeholder: 'Qty',
                    },
                    {
                        key: 'unit_code',
                        name: 'unit_code',
                        label: '',
                        width: '100px',
                        readOnly: true,
                        placeholder: 'Unit',
                    },
                ],
                collapsedFields: [
                    {
                        key: 'notes',
                        name: 'notes',
                        label: 'Line Notes',
                        type: 'textarea',
                        col: 24,
                        rows: 2,
                        placeholder: 'Line notes',
                    },
                ],
            },

            {
                name: 'notes',
                label: 'Notes',
                type: 'textarea',
                col: 24,
                rows: 6,
                placeholder: 'Notes',
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
            {
                title: '#TRANSFER',
                dataIndex: 'transfer_number',
                key: 'transfer_number',
                width: 160,
                backendSort: true,
                sortField: 'transfer_number',
                render: (value) => <Text strong>{value || 'DRAFT'}</Text>,
            },
            {
                title: 'Date',
                dataIndex: 'date',
                key: 'date',
                width: 130,
                backendSort: true,
                sortField: 'date',
                render: (value) => {
                    if (!value) return '-';
                    const parsed = dayjs(value);
                    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
                },
            },
            {
                title: 'Reference',
                dataIndex: 'reference',
                key: 'reference',
                width: 170,
                render: (value) => value || '-',
            },
            {
                title: 'Source Warehouse',
                dataIndex: 'source_warehouse_name',
                key: 'source_warehouse_name',
                width: 220,
                render: (_, record) =>
                    record?.source_warehouse_name ||
                    record?.source_warehouse?.name ||
                    record?.source_warehouse?.code ||
                    '-',
            },
            {
                title: 'Destination Warehouse',
                dataIndex: 'destination_warehouse_name',
                key: 'destination_warehouse_name',
                width: 240,
                render: (_, record) =>
                    record?.destination_warehouse_name ||
                    record?.destination_warehouse?.name ||
                    record?.destination_warehouse?.code ||
                    '-',
            },
            {
                title: 'Items',
                dataIndex: 'items',
                key: 'items',
                width: 100,
                align: 'right',
                render: (value, record) => {
                    const items = Array.isArray(value)
                        ? value
                        : Array.isArray(record?.lines)
                            ? record.lines
                            : [];

                    return items.length;
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (value, record) => {
                    const status = value || (record?.approved ? 'approved' : 'draft');

                    if (status === 'approved') return <Tag color="green">Approved</Tag>;
                    if (status === 'transferred') return <Tag color="blue">Transferred</Tag>;
                    if (status === 'cancelled') return <Tag color="red">Cancelled</Tag>;

                    return <Tag>Draft</Tag>;
                },
            },
        ],
        [],
    );

    const transformPayload = (values) => {
        const items = (values.items || [])
            .filter((row) => row.product_id)
            .map((row) => ({
                id: row.id,
                product_id: row.product_id,
                quantity: toNumber(row.quantity),
                unit_code: row.unit_code || '',
                notes: row.notes || '',
            }));

        return {
            transfer_number: values.transfer_number || 'DRAFT',
            date: formatDateForBackend(values.date),
            reference: values.reference || '',

            source_warehouse_id: values.source_warehouse_id,
            destination_warehouse_id: values.destination_warehouse_id,

            notes: values.notes || '',

            approved: !!values.approved,
            status: values.status || 'draft',

            items,
        };
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const sourceWarehouse = values?.source_warehouse_id_detail;

        if (sourceWarehouse) {
            const name =
                sourceWarehouse.name ||
                sourceWarehouse.display_name ||
                sourceWarehouse.code ||
                '';

            if (name && values.source_warehouse_name !== name) {
                setFieldValue('source_warehouse_name', name, false);
            }
        }

        const destinationWarehouse = values?.destination_warehouse_id_detail;

        if (destinationWarehouse) {
            const name =
                destinationWarehouse.name ||
                destinationWarehouse.display_name ||
                destinationWarehouse.code ||
                '';

            if (name && values.destination_warehouse_name !== name) {
                setFieldValue('destination_warehouse_name', name, false);
            }
        }

        (values.items || []).forEach((row, index) => {
            const product = row?.product_id_detail;

            if (!product) return;

            const productName =
                product.name ||
                product.display_name ||
                product.title ||
                '';

            const productCode =
                product.code ||
                product.sku ||
                '';

            const unitCode =
                product.unit_code ||
                product.primary_unit?.short_name ||
                product.primary_unit?.name ||
                product.unit?.short_name ||
                product.unit?.name ||
                row.unit_code ||
                '';

            if (productName && values.items?.[index]?.product_name !== productName) {
                setFieldValue(`items[${index}].product_name`, productName, false);
            }

            if (productCode && values.items?.[index]?.product_code !== productCode) {
                setFieldValue(`items[${index}].product_code`, productCode, false);
            }

            if (unitCode && values.items?.[index]?.unit_code !== unitCode) {
                setFieldValue(`items[${index}].unit_code`, unitCode, false);
            }
        });
    };

    const renderSaveButton = ({ submitForm, isValid, isSubmitting }) => (
        <Button
            type="primary"
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            onClick={submitForm}
            style={{
                minWidth: 165,
                height: 52,
                borderRadius: 2,
                background: '#18b957',
                borderColor: '#18b957',
                fontWeight: 650,
                fontSize: 16,
            }}
        >
            Save
        </Button>
    );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Warehouse Transfer
                </h2>
            }
        >
            <Head title="Warehouse Transfer" />

            <ReusableCrud
                title="Warehouse Transfer"
                apiUrl={api('/api/warehouse-transfers/')}
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
                defaultSortField="created_at"
                defaultSortOrder="descend"
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                renderSubmitButton={renderSaveButton}
                anchorFilters={[
                    {
                        key: 'draft',
                        label: 'Draft',
                        title: 'Warehouse Transfer',
                        params: { approved: false },
                    },
                    {
                        key: 'approved',
                        label: 'Approved',
                        title: 'Warehouse Transfer',
                        params: { approved: true },
                    },
                    {
                        key: 'transferred',
                        label: 'Transferred',
                        title: 'Warehouse Transfer',
                        params: { status: 'transferred' },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Warehouse Transfer',
                        params: {},
                    },
                ]}
                defaultAnchorKey="draft"
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