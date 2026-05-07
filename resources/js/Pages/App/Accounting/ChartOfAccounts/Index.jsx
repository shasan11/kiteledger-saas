import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Radio, Tag, Typography, Space } from 'antd';
import {
    AppstoreOutlined,
    BarsOutlined,
    ApartmentOutlined,
    BankOutlined,
    WalletOutlined,
    RiseOutlined,
    FallOutlined,
    DollarCircleOutlined,
    NodeIndexOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

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

const accountTypeMeta = {
    asset: {
        label: 'Asset',
        color: 'blue',
        icon: <BankOutlined />,
    },
    liability: {
        label: 'Liability',
        color: 'red',
        icon: <WalletOutlined />,
    },
    equity: {
        label: 'Equity',
        color: 'purple',
        icon: <ApartmentOutlined />,
    },
    income: {
        label: 'Income',
        color: 'green',
        icon: <RiseOutlined />,
    },
    expense: {
        label: 'Expense',
        color: 'orange',
        icon: <FallOutlined />,
    },
};

const renderAccountType = (type) => {
    const normalized = String(type || 'asset').toLowerCase();

    const meta = accountTypeMeta[normalized] || {
        label: normalized
            ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
            : 'Asset',
        color: 'default',
        icon: <DollarCircleOutlined />,
    };

    return (
        <Tag
            color={meta.color}
            icon={meta.icon}
            style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                padding: '3px 10px',
                fontWeight: 600,
                minWidth: 96,
                textAlign: 'center',
            }}
        >
            {meta.label}
        </Tag>
    );
};

const ViewModeHeader = ({ viewMode, setViewMode, activeAnchor }) => {
    const isTree = viewMode === 'tree';

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #eef0f4',
                borderRadius: 6,
                
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 6,
                        background: '#f6f8fb',
                        border: '1px solid #e8edf3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color: '#1677ff',
                    }}
                >
                    {isTree ? <NodeIndexOutlined /> : <UnorderedListOutlined />}
                </div>

                <div>
                    <Title
                        level={4}
                        style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#0f172a',
                        }}
                    >
                        Chart of Accounts
                    </Title>

                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                        {isTree
                            ? 'Tree view'
                            : 'Default list view'}
                    </Text>
                </div>
            </div>

            <Space size={12} wrap>
                <Tag
                    color={activeAnchor === 'system' ? 'gold' : 'green'}
                    style={{
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontWeight: 600,
                    }}
                >
                    {activeAnchor === 'system' ? 'Groups' : 'Accounts'}
                </Tag>

                <Radio.Group
                    value={viewMode}
                    onChange={(event) => setViewMode(event.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                >
                    <Radio.Button value="list">
                        <BarsOutlined /> Default List View
                    </Radio.Button>

                    <Radio.Button value="tree">
                        <AppstoreOutlined /> Tree View
                    </Radio.Button>
                </Radio.Group>
            </Space>
        </div>
    );
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
                width: 110,
                backendSort: true,
                sortField: 'code',
                render: (value) => (
                    <Text
                        strong
                        style={{
                            color: '#0f172a',
                            fontSize: 13,
                        }}
                    >
                        {value || '-'}
                    </Text>
                ),
            },
            {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                width: 340,
                backendSort: true,
                sortField: 'name',
                render: (value, record) => {
                    const isParent = !record?.parent_id && !record?.parent;

                    return (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            {isTreeView ? (
                                <span
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 6,
                                        background: isParent ? '#f0f7ff' : '#f8fafc',
                                        border: '1px solid #e5eaf1',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isParent ? '#1677ff' : '#64748b',
                                    }}
                                >
                                    {isParent ? <ApartmentOutlined /> : <NodeIndexOutlined />}
                                </span>
                            ) : null}

                            <span>
                                <Text strong={isTreeView && isParent}>
                                    {value || '-'}
                                </Text>

                                {isTreeView && record?.children?.length ? (
                                    <Text
                                        style={{
                                            display: 'block',
                                            fontSize: 12,
                                            color: '#94a3b8',
                                            lineHeight: '16px',
                                        }}
                                    >
                                        {record.children.length} child account
                                        {record.children.length > 1 ? 's' : ''}
                                    </Text>
                                ) : null}
                            </span>
                        </span>
                    );
                },
            },
            {
                title: 'Account Type',
                key: 'account_type',
                width: 160,
                align: 'center',
                render: (_, record) =>
                    renderAccountType(
                        record?.type ||
                            record?.parent?.type ||
                            'asset',
                    ),
            },
            {
                title: 'Parent',
                dataIndex: 'parent_name',
                key: 'parent_name',
                width: 220,
                render: (_, record) => {
                    const parent = getLabel(
                        record?.parent_name,
                        record?.parent?.label,
                        record?.parent?.name,
                        record?.parent?.code,
                    );

                    return parent === '-' ? (
                        <Tag
                            style={{
                                borderRadius: 999,
                                marginInlineEnd: 0,
                                color: '#475569',
                            }}
                        >
                            Root Account
                        </Tag>
                    ) : (
                        <Text style={{ color: '#475569' }}>{parent}</Text>
                    );
                },
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
                readOnly: true,
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
                name: 'description',
                label: 'Description',
                type: 'textarea',
                col: 24,
                rows: 3,
                placeholder: 'Description',
            },
        ],
        [],
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
            <Head title="Chart of Accounts" />

            <div
                style={{
                    background: '#f6f8fb',
                    minHeight: '100vh',
                    paddingBottom: 16,
                }}
            >
                <ViewModeHeader
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    activeAnchor={activeAnchor}
                />

                <div style={{ marginTop: 12 }}>
                    <ReusableCrud
                        key={`chart-of-accounts-${viewMode}-${activeAnchor}`}
                        icon={isTreeView ? <NodeIndexOutlined /> : <AppstoreOutlined />}
                        title="Chart of Accounts"
                        apiUrl={api('/api/chart-of-accounts/')}
                        columns={columns}
                        fields={fields}
                        validationSchema={validationSchema}
                        crudInitialValues={crudInitialValues}
                        transformPayload={transformPayload}
                onFormValuesChange={handleFormValuesChange}
                activeTableRowFunction={(record) => ({
                    onClick: (event) => {
                        if (event.target.closest('button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger')) return;
                        router.visit(route('accounting.chart-of-accounts.show', record.id));
                    },
                    style: { cursor: 'pointer' },
                })}
                form_ui="modal"
                        modalWidth={500}
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
                                label: 'Accounts',
                                title: 'Chart of Accounts',
                                params: {
                                    is_system_generated: false,
                                },
                            },
                            {
                                key: 'system',
                                label: 'Groups',
                                title: 'Chart of Accounts',
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
                        canEdit={activeAnchor === 'non_system'}
                        canDelete={activeAnchor === 'non_system'}
                        canView
                        hasActions
                        hasActionColumns
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
