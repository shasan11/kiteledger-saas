import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import { Radio, Tag, Typography } from 'antd';
import {
    AppstoreOutlined,
    BarsOutlined,
    ApartmentOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const getLabel = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }

    return '-';
};

export default function ChartOfAccounts(props) {
    const [viewMode, setViewMode] = useState('list');
    const [activeAnchor, setActiveAnchor] = useState('non_system');

    const isTreeView = viewMode === 'tree';

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
                width: 260,
                backendSort: true,
                sortField: 'name',
                render: (value, record) =>
                    isTreeView ? (
                        <span>
                            <ApartmentOutlined style={{ marginRight: 8 }} />
                            <Text strong={!record?.parent_id}>{value || '-'}</Text>
                        </span>
                    ) : (
                        value || '-'
                    ),
            },
            {
                title: 'Linked Account',
                dataIndex: 'account_name',
                key: 'account_name',
                width: 240,
                render: (_, record) =>
                    getLabel(
                        record?.account_name,
                        record?.account?.label,
                        record?.account?.name,
                        record?.account?.code,
                    ),
            },
            {
                title: 'Parent',
                dataIndex: 'parent_name',
                key: 'parent_name',
                width: 240,
                render: (_, record) =>
                    getLabel(
                        record?.parent_name,
                        record?.parent?.label,
                        record?.parent?.name,
                        record?.parent?.code,
                    ),
            },
            {
                title: 'Type',
                dataIndex: 'is_system_generated',
                key: 'is_system_generated',
                width: 160,
                backendSort: true,
                sortField: 'is_system_generated',
                render: (value) =>
                    value ? (
                        <Tag color="blue">System Generated</Tag>
                    ) : (
                        <Tag color="green">Non System</Tag>
                    ),
            },
             
        ],
        [isTreeView],
    );

    const fields = useMemo(
        () => [
            {
                name: 'name',
                label: 'Name',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Chart account name',
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                
                col: 24,
                readOnly:true,
                placeholder: '#Auto Generated Code',
            },
            {
                name: 'parent_id',
                label: 'Parent Chart Account',
                type: 'fkSelect',
                col: 24,
                placeholder: 'Select parent chart account',
                fkUrl: '/api/chart-of-accounts/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'parent_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) => {
                    const code = row?.code || '';
                    const name = row?.name || '';

                    return [code, name].filter(Boolean).join(' - ');
                },
            },
            {
                name: 'branch_id',
                label: 'Branch',
                type: 'fkSelect',
                col: 12,
                placeholder: 'Select branch',
                fkUrl: '/api/branches/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'branch_name',
                fkExtraParams: {
                    active: true,
                },
                fkLabel: (row) => {
                    const code = row?.code || '';
                    const name = row?.name || '';

                    return [code, name].filter(Boolean).join(' - ');
                },
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
        [activeAnchor],
    );

    const validationSchema = Yup.object().shape({
        name: Yup.string()
            .trim()
            .max(150, 'Name cannot exceed 150 characters')
            .required('Name is required'),

        parent_id: Yup.string().nullable(),

        branch_id: Yup.string().nullable(),

        description: Yup.string().nullable(),

        active: Yup.boolean().nullable(),
    });

    const crudInitialValues = {
        parent_id: null,
        parent_id_detail: null,
        parent_name: '',

        code: '',
        name: '',
        description: '',

        active: true,
    };

    const transformPayload = (values) => {
        const payload = {
            parent_id: values.parent_id || null,

            code: values.code?.trim() || null,
            name: values.name?.trim() || null,
            description: values.description?.trim() || null,
            active: values.active !== false,
        };

        Object.keys(payload).forEach((key) => {
            if (payload[key] === '') {
                payload[key] = null;
            }
        });

        return payload;
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const parent = values?.parent_id_detail;

        if (parent) {
            const label =
                parent.label ||
                [parent.code, parent.name].filter(Boolean).join(' - ') ||
                parent.name ||
                '';

            if (label && values.parent_name !== label) {
                setFieldValue('parent_name', label, false);
            }
        }
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Chart Of Accounts" />

            <div
                style={{
                    background: '#fff',
                    borderBottom: '1px solid #eef0f4',
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <Radio.Group
                    value={viewMode}
                    onChange={(event) => setViewMode(event.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                >
                    <Radio.Button value="list">
                        <BarsOutlined /> List
                    </Radio.Button>

                    <Radio.Button value="tree">
                        <AppstoreOutlined /> Tree
                    </Radio.Button>
                </Radio.Group>
            </div>

            <ReusableCrud
                key={`chart-of-accounts-${viewMode}-${activeAnchor}`}
                icon={<AppstoreOutlined />}
                title="Chart Of Accounts"
                apiUrl={api('/api/chart-of-accounts/')}
                columns={columns}
                fields={fields}
                validationSchema={validationSchema}
                crudInitialValues={crudInitialValues}
                transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}

                form_ui="modal"
                modalWidth={720}

                enableServerPagination
                pageParam="page"
                pageSizeParam="page_size"
                searchParam="search"
                activeParam="active"

                sortMode="ordering"
                orderingParam="ordering"
                defaultSortField={isTreeView ? 'code' : 'created_at'}
                defaultSortOrder={isTreeView ? 'ascend' : 'descend'}

                baseFilters={
                    isTreeView
                        ? {
                              tree: true,
                          }
                        : {}
                }

                anchorFilters={[
                    {
                        key: 'non_system',
                        label: 'Non System Generated',
                        title: 'Chart Of Accounts',
                        params: {
                            is_system_generated: false,
                        },
                    },
                    {
                        key: 'system',
                        label: 'System Generated',
                        title: 'Chart Of Accounts',
                        params: {
                            is_system_generated: true,
                        },
                    },
                ]}
                defaultAnchorKey="non_system"
                anchorSyncWithHash
                onAnchorChange={(key) => setActiveAnchor(key)}

                enableInactiveDrawer={!isTreeView}
                showSearch

                canAdd={activeAnchor === 'non_system'}
                canEdit
                canDelete
                canView

                hasActions
                hasActionColumns
            />
        </AuthenticatedLayout>
    );
}