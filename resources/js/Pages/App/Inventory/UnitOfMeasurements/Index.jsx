import React, { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head } from '@inertiajs/react';
import { Tag, Typography } from 'antd';
import * as Yup from 'yup';
import ReusableCrud from '@/Components/ResuableCrud';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const initialValues = {
    name: '',
    short_name: '',
    description: '',
    accepts_fraction: true,
    active: true,
};

const validationSchema = Yup.object().shape({
    name: Yup.string()
        .trim()
        .required('Name is required')
        .max(150, 'Name must be less than 150 characters'),

    short_name: Yup.string()
        .trim()
        .required('Short name is required')
        .max(30, 'Short name must be less than 30 characters'),

    description: Yup.string().nullable(),
    accepts_fraction: Yup.boolean(),
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
                name: 'short_name',
                label: 'Short Name',
                required: true,
                col: 24,
                placeholder: 'Short Name',
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                col: 24,
                rows: 3,
                placeholder: 'Description',
            },
            {
                name: 'accepts_fraction',
                label: 'Accepts Fraction',
                type: 'switch',
                col: 24,
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
                title: 'Short Name',
                dataIndex: 'short_name',
                key: 'short_name',
                width: 160,
                backendSort: true,
                sortField: 'short_name',
                render: (value) => value || '-',
            },
            {
                title: 'Accepts Fraction',
                dataIndex: 'accepts_fraction',
                key: 'accepts_fraction',
                width: 160,
                render: (value) =>
                    value ? (
                        <Tag color="green">Yes</Tag>
                    ) : (
                        <Tag color="red">No</Tag>
                    ),
            },
            {
                title: 'Description',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true,
                render: (value) => value || '-',
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
        short_name: values.short_name || '',
        description: values.description || '',
        accepts_fraction: !!values.accepts_fraction,
        active: values.active !== false,
    });

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Unit of Measurement
                </h2>
            }
        >
            <Head title="Unit of Measurement" />

            <ReusableCrud
                title="Unit of Measurement"
                apiUrl={api('/api/units-of-measurement/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth={760}
                modalWidth={760}
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
                        title: 'Unit of Measurement',
                        params: { active: true },
                    },
                    {
                        key: 'inactive',
                        label: 'Inactive',
                        title: 'Unit of Measurement',
                        params: { active: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Unit of Measurement',
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