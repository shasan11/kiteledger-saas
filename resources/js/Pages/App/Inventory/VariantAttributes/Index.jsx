import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';
const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const emptyOption = {
    name: '',
};

const initialValues = {
    name: '',
    options: [{ ...emptyOption }],
    active: true,
};

const validationSchema = Yup.object().shape({
    name: Yup.string()
        .trim()
        .required('Name is required')
        .max(120, 'Name must be less than 120 characters'),

    options: Yup.array()
        .of(
            Yup.object().shape({
                name: Yup.string()
                    .trim()
                    .required('Option name is required')
                    .max(120, 'Option name must be less than 120 characters'),
            }),
        )
        .min(1, 'At least one option is required'),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'name',
                label: 'Name',
                required: true,
                col: 24,
                placeholder: 'Name',
            },

            {
                name: '_variant_options_title',
                label: '',
                type: 'custom',
                col: 24,
                render: () => (
                    <div
                        style={{
                            marginTop: 12,
                            marginBottom: 8,
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#8b95a5',
                        }}
                    >
                        Variant Options
                    </div>
                ),
            },

            {
                name: 'options',
                label: '',
                type: 'objectArray',
                col: 24,
                headerBg: '#424b59',
                headerColor: '#ffffff',
                addButtonLabel: '+ NEW',
                defaultItem: { ...emptyOption },
                columns: [
                    {
                        key: 'name',
                        name: 'name',
                        label: 'Options Name',
                        placeholder: 'Enter Options',
                        width: '1fr',
                    },
                ],
            },
        ],
        [],
    );

    const columns = useMemo(
        () => [
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
                title: 'Options',
                dataIndex: 'options',
                key: 'options',
                render: (value, record) => {
                    const options = Array.isArray(value)
                        ? value
                        : Array.isArray(record?.variant_options)
                            ? record.variant_options
                            : [];

                    if (!options.length) return '-';

                    return (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {options.map((option, index) => (
                                <Tag key={option?.id || index}>
                                    {option?.name || option?.option_name || option}
                                </Tag>
                            ))}
                        </div>
                    );
                },
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

    const transformPayload = (values) => ({
        name: values.name || '',
        active: values.active !== false,
        options: (values.options || [])
            .filter((row) => String(row?.name || '').trim())
            .map((row) => ({
                id: row.id,
                name: String(row.name || '').trim(),
            })),
    });

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Variant Attribute
                </h2>
            }
        >
            <Head title="Variant Attribute" />

            <ReusableCrud
                title="Variant Attribute"
                apiUrl={api('/api/variant-attributes/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth={820}
                modalWidth={820}
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
                anchorFilters={[
                    {
                        key: 'active',
                        label: 'Active',
                        title: 'Variant Attribute',
                        params: { active: true },
                    },
                    {
                        key: 'inactive',
                        label: 'Inactive',
                        title: 'Variant Attribute',
                        params: { active: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Variant Attribute',
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