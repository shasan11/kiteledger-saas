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
    parent_id: null,
    parent_id_detail: null,
    parent_name: '',
    description: '',
    active: true,
};

const validationSchema = Yup.object().shape({
    name: Yup.string()
        .trim()
        .required('Name is required')
        .max(150, 'Name must be less than 150 characters'),
    parent_id: Yup.string().nullable(),
    description: Yup.string().nullable(),
});

export default function Index() {
    const fields = useMemo(
        () => [
            {
                name: 'name',
                label: 'Name',
                required: true,
                col: 12,
                placeholder: 'Category Name',
            },
            {
                name: 'parent_id',
                label: 'Under',
                type: 'fkSelect',
                col: 12,
                placeholder: 'Select Parent Category',
                fkUrl: '/api/product-categories/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'parent_name',
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
                name: 'description',
                label: 'Description',
                type: 'textarea',
                col: 24,
                rows: 4,
                placeholder: 'Description',
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
                title: 'Under',
                dataIndex: 'parent_name',
                key: 'parent_name',
                width: 240,
                render: (_, record) =>
                    record?.parent_name ||
                    record?.parent?.name ||
                    record?.parent_category?.name ||
                    '-',
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
        parent_id: values.parent_id || null,
        description: values.description || '',
        active: values.active !== false,
    });

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Product Category
                </h2>
            }
        >
            <Head title="Product Category" />

            <ReusableCrud
                title="Product Category"
                apiUrl={api('/api/product-categories/')}
                fields={fields}
                columns={columns}
                validationSchema={validationSchema}
                crudInitialValues={initialValues}
                form_ui="drawer"
                drawerWidth={900}
                modalWidth={900}
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
                        title: 'Product Category',
                        params: { active: true },
                    },
                    {
                        key: 'inactive',
                        label: 'Inactive',
                        title: 'Product Category',
                        params: { active: false },
                    },
                    {
                        key: 'all',
                        label: 'All',
                        title: 'Product Category',
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