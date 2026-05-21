import React, { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import { Radio, Tag, Typography, Space, theme } from 'antd';
import {
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

const accountTypeOptions = Object.entries(accountTypeMeta).map(([value, meta]) => ({
    value,
    label: meta.label,
}));

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

const PageHeader = ({
    viewMode,
    setViewMode,
    activeAnchor,
    setActiveAnchor,
}) => {
    const { token } = theme.useToken();

    const anchorTabs = [
        {
            key: 'non_system',
            label: 'Accounts',
        },
        {
            key: 'system',
            label: 'Groups',
        },
    ];

    return (
        <div
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                padding: `0 ${token.paddingSM}px`,
                minHeight: 42,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: token.marginSM,
                flexWrap: 'wrap',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: token.marginSM,
                     
                    height: 42,
                }}
            >
                <Text
                    strong
                    style={{
                        fontSize: "18px",
                        color: token.colorText,
                        whiteSpace: 'nowrap',
                        minWidth: "33%",
                        lineHeight: '42px',
                        fontWeight:700
                    }}
                >
                    Chart of Accounts
                </Text>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: 42,
                        gap: 2,
                    }}
                >
                    {anchorTabs.map((tab) => {
                        const active = activeAnchor === tab.key;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveAnchor(tab.key)}
                                style={{
                                    height: 42,
                                    padding: `0 ${token.paddingSM}px`,
                                    border: 0,
                                    borderBottom: active
                                        ? `2px solid ${token.colorPrimary}`
                                        : '2px solid transparent',
                                    background: 'transparent',
                                    color: active
                                        ? token.colorPrimary
                                        : token.colorTextSecondary,
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer',
                                    fontSize: token.fontSizeSM,
                                    lineHeight: '40px',
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <Radio.Group
                size="small"
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value)}
                optionType="button"
                buttonStyle="solid"
                style={{
                    whiteSpace: 'nowrap',
                }}
            >
                <Radio.Button value="list">
                    <UnorderedListOutlined /> List
                </Radio.Button>

                <Radio.Button value="tree">
                    <ApartmentOutlined /> Tree
                </Radio.Button>
            </Radio.Group>
        </div>
    );
};

export default function ChartOfAccounts(props) {
    const { token } = theme.useToken();

    const [viewMode, setViewMode] = useState('list');
    const [activeAnchor, setActiveAnchor] = useState('non_system');

    const isTreeView = viewMode === 'tree';
    const isSystemView = activeAnchor === 'system';

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
                            color: token.colorText,
                            fontSize: token.fontSizeSM,
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
                                gap: token.marginXS,
                            }}
                        >
                            {isTreeView ? (
                                <span
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: token.borderRadius,
                                        background: isParent
                                            ? token.colorPrimaryBg
                                            : token.colorFillQuaternary,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isParent
                                            ? token.colorPrimary
                                            : token.colorTextSecondary,
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
                                            fontSize: token.fontSizeSM,
                                            color: token.colorTextTertiary,
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
                backendFilter: {
                    title: 'Account Type',
                    paramName: 'type',
                    type: 'select',
                    options: accountTypeOptions,
                },
                backendSort: true,
                sortField: 'type',
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
                backendFilter: {
                    title: 'Parent',
                    paramName: 'parent_id',
                    type: 'autocomplete',
                    fkUrl: '/api/chart-of-accounts/',
                    fkSearchParam: 'search',
                    fkPageSize: 20,
                    fkValueKey: 'id',
                    fkLabelKey: 'name',
                    fkExtraParams: {
                        active: true,
                    },
                    fkLabel: (row) => {
                        const code = row?.code || '';
                        const name = row?.name || '';

                        return [code, name].filter(Boolean).join(' - ');
                    },
                },
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
                                color: token.colorTextSecondary,
                            }}
                        >
                            Root Account
                        </Tag>
                    ) : (
                        <Text style={{ color: token.colorTextSecondary }}>
                            {parent}
                        </Text>
                    );
                },
            },
        ],
        [isTreeView, token],
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
                col: 12,
                readOnly: true,
                placeholder: '#Auto Generated Code',
            },
            {
                name: 'type',
                label: 'Account Type',
                type: 'select',
                required: true,
                col: 12,
                options: accountTypeOptions,
                placeholder: 'Select account type',
                readOnly: (values) => !!values?.parent_id,
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

        type: Yup.string()
            .oneOf(accountTypeOptions.map((option) => option.value))
            .required('Account type is required'),

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
        type: 'asset',
        description: '',

        active: true,
    };

    const transformPayload = (values) => {
        const payload = {
            parent_id: values.parent_id || null,
            code: values.code?.trim() || null,
            name: values.name?.trim() || null,
            type: values.type || 'asset',
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

        if (!values?.parent_id) {
            if (values?.parent_name) {
                setFieldValue('parent_name', '', false);
            }

            return;
        }

        if (!parent) {
            return;
        }

        const label =
            parent.label ||
            [parent.code, parent.name].filter(Boolean).join(' - ') ||
            parent.name ||
            '';

        if (label && values.parent_name !== label) {
            setFieldValue('parent_name', label, false);
        }

        if (parent.type && values.type !== parent.type) {
            setFieldValue('type', parent.type, false);
        }
    };

    const baseFilters = useMemo(
        () => ({
            is_system_generated: isSystemView,
            ...(isTreeView ? { tree: true } : {}),
        }),
        [isSystemView, isTreeView],
    );

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Chart of Accounts" />

            <div
                style={{
                    background: token.colorBgLayout,
                    minHeight: '100vh',
                    
                }}
            >
                <PageHeader
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    activeAnchor={activeAnchor}
                    setActiveAnchor={setActiveAnchor}
                />

                <div>
                    <ReusableCrud
                        key={`chart-of-accounts-${viewMode}-${activeAnchor}`}
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
                                if (
                                    event.target.closest(
                                        'button,a,input,textarea,.ant-checkbox-wrapper,.ant-dropdown-trigger',
                                    )
                                ) {
                                    return;
                                }

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
                        baseFilters={baseFilters}
                        enableInactiveDrawer={!isTreeView && !isSystemView}
                        showSearch
                        canAdd={!isSystemView}
                        canEdit={!isSystemView}
                        canDelete={!isSystemView}
                        canView
                        hasActions
                        hasActionColumns
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}