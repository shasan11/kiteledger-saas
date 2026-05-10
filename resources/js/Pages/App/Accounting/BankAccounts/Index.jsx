import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from "@/Components/ReusableCrud";
import { Head, router } from '@inertiajs/react';
import * as Yup from 'yup';
import axios from 'axios';
import {
    BankOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    WalletOutlined,
    MoreOutlined,
    CopyOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Dropdown,
    Empty,
    Input,
    message,
    Row,
    Select,
    Space,
    Tabs,
    Tag,
    Typography,
} from 'antd';
import { useMoneyFormatter } from '@/Pages/App/Accounting/Shared/currency';

const { Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const getAuthHeaders = () => {
    const token =
        typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

    return token ? { Authorization: `Bearer ${token}` } : {};
};

const getLabel = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return '-';
};

const cleanParams = (params = {}) =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== null && value !== '',
        ),
    );

const appendQueryParams = (url, params = {}) => {
    const cleaned = cleanParams(params);

    const qs = Object.entries(cleaned)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    if (!qs) return url;
    return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const isValidCopyValue = (value) => {
    if (value === undefined || value === null) return false;
    const text = String(value).trim();
    return text !== '' && text !== '-';
};

const buildBankAccountCopyText = (record, currencyLabel) => {
    const isBank = record?.type === 'bank';

    const rows = [
        ['Account Type', isBank ? 'Bank Account' : 'Cash Account'],
        ['Display Name', record?.display_name],
        ['Code', record?.code],
        ['Currency', currencyLabel],
        ...(isBank
            ? [
                  ['Bank Name', record?.bank_name],
                  ['Account Name', record?.account_name],
                  ['Account Number', record?.account_number],
                  ['Bank Account Type', record?.account_type],
                  ['Swift Code', record?.swift_code],
              ]
            : []),
        ['Description', record?.description],
    ];

    return rows
        .filter(([, value]) => isValidCopyValue(value))
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
};

const copyText = async (text) => {
    if (!text) return false;

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (error) {
        console.warn(error);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    return copied;
};

export default function BankAccounts() {
    const apiUrl = api('/api/bank-accounts/');
    const { formatMoney } = useMoneyFormatter();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [tabKey, setTabKey] = useState('all');

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });

    const [formKey, setFormKey] = useState(0);
    const [formMode, setFormMode] = useState('add');
    const [editId, setEditId] = useState(null);

    const activeFilter = useMemo(() => {
        if (tabKey === 'inactive') return 'false';
        return 'all';
    }, [tabKey]);

    const fetchRows = useCallback(
        async ({ page, pageSize, search, type, active } = {}) => {
            try {
                setLoading(true);

                const currentActive = active ?? activeFilter;

                const url = appendQueryParams(apiUrl, {
                    page: page ?? pagination.current,
                    page_size: pageSize ?? pagination.pageSize,
                    search: search ?? searchText,
                    type: type ?? typeFilter,
                    active: currentActive === 'all' ? undefined : currentActive,
                    ordering: 'display_name',
                });

                const res = await axios.get(url, {
                    headers: getAuthHeaders(),
                });

                const payload = res?.data;

                if (Array.isArray(payload?.results)) {
                    setRows(payload.results);
                    setPagination((prev) => ({
                        ...prev,
                        current: page ?? prev.current,
                        pageSize: pageSize ?? prev.pageSize,
                        total: Number(payload.count || 0),
                    }));
                    return;
                }

                if (Array.isArray(payload)) {
                    setRows(payload);
                    setPagination((prev) => ({
                        ...prev,
                        current: 1,
                        total: payload.length,
                    }));
                    return;
                }

                setRows([]);
                setPagination((prev) => ({
                    ...prev,
                    total: 0,
                }));
            } catch (error) {
                console.error(error);
                message.error('Failed to load bank accounts.');
            } finally {
                setLoading(false);
            }
        },
        [
            apiUrl,
            pagination.current,
            pagination.pageSize,
            searchText,
            typeFilter,
            activeFilter,
        ],
    );

    useEffect(() => {
        fetchRows({ page: 1 });
    }, [fetchRows]);

    const openAddForm = () => {
        setFormMode('add');
        setEditId(null);
        setFormKey((prev) => prev + 1);
    };

    const openEditForm = (record) => {
        setFormMode('edit');
        setEditId(record.id);
        setFormKey((prev) => prev + 1);
    };

    const softDelete = async (record) => {
        try {
            await axios.put(
                `${apiUrl.replace(/\/+$/, '')}/${record.id}`,
                { active: false },
                { headers: getAuthHeaders() },
            );
            message.success('Bank account made inactive.');
            fetchRows();
        } catch (error) {
            console.error(error);
            message.error('Failed to update bank account.');
        }
    };

    const restoreRecord = async (record) => {
        try {
            await axios.put(
                `${apiUrl.replace(/\/+$/, '')}/${record.id}`,
                { active: true },
                { headers: getAuthHeaders() },
            );
            message.success('Bank account activated.');
            fetchRows();
        } catch (error) {
            console.error(error);
            message.error('Failed to update bank account.');
        }
    };

    const handleCopyBankAccountInfo = async (record) => {
        const currencyLabel = getLabel(
            record?.currency_name,
            record?.currency?.label,
            record?.currency?.code,
            record?.currency?.name,
        );

        const text = buildBankAccountCopyText(record, currencyLabel);

        if (!text) {
            message.warning('No bank account information available to copy.');
            return;
        }

        const copied = await copyText(text);

        if (copied) {
            message.success('Bank account details copied.');
        } else {
            message.error('Failed to copy bank account details.');
        }
    };

    const accountTypeCard = ({ values, setFieldValue, readOnly }) => {
        const selected = values?.type;

        const items = [
            { value: 'bank', label: 'Bank', icon: <BankOutlined /> },
            { value: 'cash', label: 'Cash', icon: <WalletOutlined /> },
        ];

        return (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {items.map((item) => {
                    const active = selected === item.value;

                    return (
                        <button
                            key={item.value}
                            type="button"
                            disabled={readOnly}
                            onClick={() => {
                                setFieldValue('type', item.value);

                                if (item.value === 'cash') {
                                    setFieldValue('bank_name', '');
                                    setFieldValue('account_name', '');
                                    setFieldValue('account_number', '');
                                    setFieldValue('account_type', '');
                                    setFieldValue('swift_code', '');
                                }
                            }}
                            style={{
                                width: 130,
                                height: 40,
                                border: active ? '1px solid #1677ff' : '1px solid #d9dee7',
                                background: active ? '#fff' : '#f8fafc',
                                borderRadius: 4,
                                cursor: readOnly ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    const sectionTitle = (title) => () => (
        <div
            style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#667085',
                marginBottom: -8,
            }}
        >
            {title}
        </div>
    );

    const fields = useMemo(
        () => [
            {
                name: 'type',
                label: 'Type',
                type: 'custom',
                required: true,
                col: 24,
                render: accountTypeCard,
            },
            {
                name: 'bank_name',
                label: 'Bank',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Bank name',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'display_name',
                label: 'Display Name',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Display name',
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                readOnly: true,
                col: 12,
                placeholder: 'Auto-generated',
            },
            {
                name: 'currency_id',
                label: 'Currency',
                type: 'fkSelect',
                required: true,
                col: 12,
                placeholder: 'Select currency',
                fkUrl: '/api/currencies/',
                fkSearchParam: 'search',
                fkPageSize: 20,
                fkValueKey: 'id',
                fkLabelKey: 'name',
                labelField: 'currency_name',
                fkExtraParams: { active: true },
                fkLabel: (row) => {
                    const code = row?.code || '';
                    const name = row?.name || '';
                    return [code, name].filter(Boolean).join(' - ');
                },
            },
            {
                name: 'bank_info_title',
                label: '',
                type: 'custom',
                col: 24,
                render: sectionTitle('Bank Info'),
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'account_name',
                label: 'Account Name',
                type: 'text',
                col: 12,
                placeholder: 'Account name',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'account_number',
                label: 'Account Number',
                type: 'text',
                col: 12,
                placeholder: 'Account number',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'account_type',
                label: 'Account Type',
                type: 'select',
                col: 12,
                placeholder: 'Select...',
                options: [
                    { value: 'saving', label: 'Saving Account' },
                    { value: 'current', label: 'Current Account' },
                    { value: 'checking', label: 'Checking Account' },
                    { value: 'fixed_deposit', label: 'Fixed Deposit' },
                    { value: 'loan', label: 'Loan Account' },
                    { value: 'overdraft', label: 'Overdraft Account' },
                ],
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'swift_code',
                label: 'Swift Code',
                type: 'text',
                col: 12,
                placeholder: 'Swift code',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                col: 24,
                rows: 1,
                placeholder: 'Description',
            },
            {
                name: 'opening_balance',
                label: 'Opening Balance',
                type: 'number',
                col: 12,
                placeholder: '0.00',
            },
        ],
        [],
    );

    const validationSchema = Yup.object().shape({
        type: Yup.string().oneOf(['bank', 'cash']).required('Type is required'),
        display_name: Yup.string()
            .trim()
            .max(150, 'Display name cannot exceed 150 characters')
            .required('Display Name is required'),
        currency_id: Yup.mixed().nullable().required('Currency is required'),
        bank_name: Yup.string().when('type', {
            is: 'bank',
            then: (schema) =>
                schema.trim().max(150, 'Bank name cannot exceed 150 characters').required('Bank is required'),
            otherwise: (schema) => schema.nullable(),
        }),
        account_name: Yup.string().nullable().max(150),
        account_number: Yup.string().nullable().max(80),
        account_type: Yup.string().nullable().max(50),
        swift_code: Yup.string().nullable().max(50),
        description: Yup.string().nullable(),
        opening_balance: Yup.number().nullable().min(0),
        active: Yup.boolean().nullable(),
        is_system_generated: Yup.boolean().nullable(),
    });

    const crudInitialValues = {
        type: 'bank',
        display_name: '',
        currency_id: null,
        currency_id_detail: null,
        currency_name: '',
        description: '',
        bank_name: '',
        account_name: '',
        account_number: '',
        account_type: '',
        swift_code: '',
        active: true,
        is_system_generated: false,
        opening_balance: 0,
    };

    const transformPayload = (values) => {
        const isBank = values.type === 'bank';

        const payload = {
            type: values.type || 'bank',
            display_name: values.display_name?.trim() || null,
            code: values.code?.trim() || null,
            currency_id: values.currency_id || null,
            description: values.description?.trim() || null,
            bank_name: isBank ? values.bank_name?.trim() || null : null,
            account_name: isBank ? values.account_name?.trim() || null : null,
            account_number: isBank ? values.account_number?.trim() || null : null,
            account_type: isBank ? values.account_type || null : null,
            swift_code: isBank ? values.swift_code?.trim() || null : null,
            active: values.active !== false,
            is_system_generated: !!values.is_system_generated,
            opening_balance: Number(values.opening_balance || 0),
        };

        Object.keys(payload).forEach((key) => {
            if (payload[key] === '') payload[key] = null;
        });

        return payload;
    };

    const handleFormValuesChange = (values, { setFieldValue }) => {
        const currencyValue = values?.currency_id_detail;

        if (currencyValue) {
            const label =
                currencyValue.label ||
                [currencyValue.code, currencyValue.name].filter(Boolean).join(' - ') ||
                currencyValue.name ||
                '';

            if (label && values.currency_name !== label) {
                setFieldValue('currency_name', label, false);
            }
        }
    };

    const hiddenColumns = useMemo(
        () => [
            {
                title: 'Display Name',
                dataIndex: 'display_name',
                key: 'display_name',
            },
        ],
        [],
    );

    const headerNode = (
        <div className="bank-page__layout-header">
            <div>
                <Title level={5} className="bank-page__title">
                    Bank Accounts
                </Title>
            </div>

            <Space size={8}>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchRows()}>
                    Reload
                </Button>

                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAddForm}>
                    Add New
                </Button>
            </Space>
        </div>
    );

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title="Bank Accounts" />

            <style>{`
                .bank-page {
                    min-height: calc(100vh - 100px);
                    background: #f5f7fb;
                    padding: 8px;
                }

                .bank-page__layout-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    min-height: 32px;
                }

                .bank-page__title {
                    margin: 0 !important;
                    line-height: 1.1 !important;
                    font-size: 16px !important;
                }

                .bank-page__toolbar-card {
                    margin-bottom: 8px;
                    border-radius: 4px;
                    border: 1px solid #e5e7eb;
                }

                .bank-page__toolbar-card .ant-card-body {
                    padding: 8px;
                }

                .bank-page__toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .bank-page__toolbar-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .bank-page__cards {
                    margin-top: 2px;
                }

                .bank-page__compact-card.ant-card {
                    border: 1px solid #dbe1ea;
                    border-radius: 10px;
                    box-shadow: none;
                    height: 100%;
                    cursor: pointer;
                }

                .bank-page__compact-card .ant-card-body {
                    padding: 12px;
                }

                .bank-page__card-head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .bank-page__card-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    min-width: 0;
                    flex: 1;
                }

                .bank-page__avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                    font-size: 16px;
                    background: #eef4ff;
                    color: #1677ff;
                }

                .bank-page__avatar.cash {
                    background: #edf9ee;
                    color: #22c55e;
                }

                .bank-page__name {
                    margin: 0 !important;
                    font-size: 14px !important;
                    line-height: 1.25 !important;
                    color: #1d4ed8 !important;
                }

                .bank-page__subname {
                    display: block;
                    margin-top: 2px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.2;
                }

                .bank-page__amount {
                    margin: 8px 0 10px 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1f2937;
                }

                .bank-page__tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .bank-page__tags .ant-tag {
                    margin-inline-end: 0;
                    margin-bottom: 0;
                    border-radius: 999px;
                    font-size: 11px;
                    line-height: 20px;
                    padding: 0 8px;
                }

                .bank-page__empty-card .ant-card-body {
                    padding: 22px;
                }

                .bank-page .ant-tabs-nav {
                    margin-bottom: 0 !important;
                }

                .bank-page .ant-tabs-tab {
                    padding-top: 6px !important;
                    padding-bottom: 10px !important;
                }

                .bank-page__hidden-crud {
                    display: none;
                }
            `}</style>

            <div className="bank-page">
                <Card className="bank-page__toolbar-card" bordered={false}>
                    <div className="bank-page__toolbar">
                        <div className="bank-page__toolbar-left">
                            <Input
                                allowClear
                                size="small"
                                prefix={<SearchOutlined />}
                                placeholder="Search bank, code, account no..."
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                onPressEnter={() =>
                                    fetchRows({
                                        page: 1,
                                        search: searchText,
                                    })
                                }
                                style={{ width: 260 }}
                            />

                            <Select
                                allowClear
                                size="small"
                                placeholder="Type"
                                value={typeFilter || undefined}
                                onChange={(value) => {
                                    const next = value || '';
                                    setTypeFilter(next);
                                    fetchRows({
                                        page: 1,
                                        type: next,
                                    });
                                }}
                                style={{ width: 120 }}
                                options={[
                                    { value: 'bank', label: 'Bank' },
                                    { value: 'cash', label: 'Cash' },
                                ]}
                            />

                            <Button
                                size="small"
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={() =>
                                    fetchRows({
                                        page: 1,
                                        search: searchText,
                                        type: typeFilter,
                                        active: activeFilter,
                                    })
                                }
                            >
                                Search
                            </Button>
                        </div>

                        <Tabs
                            activeKey={tabKey}
                            onChange={(key) => {
                                setTabKey(key);
                                fetchRows({
                                    page: 1,
                                    active: key === 'inactive' ? 'false' : 'all',
                                });
                            }}
                            items={[
                                { key: 'all', label: 'All' },
                                { key: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>
                </Card>

                {rows.length < 1 && !loading ? (
                    <Card className="bank-page__empty-card">
                        <Empty description="No bank accounts found" />
                    </Card>
                ) : (
                    <Row gutter={[12, 12]} className="bank-page__cards">
                        {rows.map((record) => {
                            const isBank = record?.type === 'bank';

                            const currencyLabel = getLabel(
                                record?.currency_name,
                                record?.currency?.label,
                                record?.currency?.code,
                                record?.currency?.name,
                            );

                            const amount = formatMoney(
                                record?.current_balance ??
                                    record?.software_ledger_balance ??
                                    record?.opening_balance ??
                                    0,
                            );

                            const menuItems = [
                                {
                                    key: 'view',
                                    label: 'View Details',
                                    icon: <EyeOutlined />,
                                },
                                {
                                    key: 'copy',
                                    label: 'Copy Details',
                                    icon: <CopyOutlined />,
                                },
                                {
                                    key: 'edit',
                                    label: 'Edit',
                                    icon: <EditOutlined />,
                                },
                                {
                                    key: record?.active === false ? 'restore' : 'delete',
                                    label: record?.active === false ? 'Make Active' : 'Make Inactive',
                                    icon: <DeleteOutlined />,
                                    danger: record?.active !== false,
                                },
                            ];

                            return (
                                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={record.id}>
                                    <Card
                                        hoverable
                                        className="bank-page__compact-card"
                                        onClick={() =>
                                            router.visit(route('accounting.bank-accounts.show', record.id))
                                        }
                                    >
                                        <div className="bank-page__card-head">
                                            <div className="bank-page__card-left">
                                                <span className={`bank-page__avatar ${isBank ? '' : 'cash'}`}>
                                                    {isBank ? <BankOutlined /> : <WalletOutlined />}
                                                </span>

                                                <div style={{ minWidth: 0 }}>
                                                    <Title level={5} className="bank-page__name">
                                                        {record?.display_name || '-'}
                                                    </Title>

                                                    <span className="bank-page__subname">
                                                        {record?.bank_name || record?.account_name || (isBank ? 'Bank Account' : 'Cash Account')}
                                                    </span>
                                                </div>
                                            </div>

                                            <Dropdown
                                                menu={{
                                                    items: menuItems,
                                                    onClick: ({ key, domEvent }) => {
                                                        domEvent?.stopPropagation?.();

                                                        if (key === 'view') {
                                                            router.visit(route('accounting.bank-accounts.show', record.id));
                                                        }

                                                        if (key === 'copy') {
                                                            handleCopyBankAccountInfo(record);
                                                        }

                                                        if (key === 'edit') {
                                                            openEditForm(record);
                                                        }

                                                        if (key === 'delete') {
                                                            softDelete(record);
                                                        }

                                                        if (key === 'restore') {
                                                            restoreRecord(record);
                                                        }
                                                    },
                                                }}
                                                trigger={['click']}
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<MoreOutlined />}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </Dropdown>
                                        </div>

                                        <div className="bank-page__amount">{amount}</div>

                                        <div className="bank-page__tags">
                                            <Tag color={isBank ? 'blue' : 'green'}>
                                                {isBank ? 'Bank' : 'Cash'}
                                            </Tag>

                                            <Tag>{currencyLabel}</Tag>

                                            {record?.code ? <Tag>{record.code}</Tag> : null}

                                            <Tag color={record?.active === false ? 'default' : 'success'}>
                                                {record?.active === false ? 'Inactive' : 'Active'}
                                            </Tag>

                                            {record?.account_type && isBank ? (
                                                <Tag>{record.account_type}</Tag>
                                            ) : null}

                                            {record?.account_number && isBank ? (
                                                <Tag>Acc: {record.account_number}</Tag>
                                            ) : null}

                                            {record?.swift_code && isBank ? (
                                                <Tag>Swift: {record.swift_code}</Tag>
                                            ) : null}

                                            {record?.description ? (
                                                <Tag>{record.description}</Tag>
                                            ) : null}
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}
            </div>

            <div className="bank-page__hidden-crud">
                <ReusableCrud
                    key={`bank-account-form-${formKey}`}
                    icon={<BankOutlined />}
                    title="Bank Account"
                    apiUrl={apiUrl}
                    columns={hiddenColumns}
                    fields={fields}
                    validationSchema={validationSchema}
                    crudInitialValues={crudInitialValues}
                    transformPayload={transformPayload}
                    onFormValuesChange={handleFormValuesChange}
                    form_ui="modal"
                    modalWidth={680}
                    openOnMount={formKey > 0}
                    openMode={formMode}
                    openEditId={editId}
                    onAddSuccess={() => fetchRows()}
                    onEditSuccess={() => fetchRows()}
                    enableServerPagination
                    pageParam="page"
                    pageSizeParam="page_size"
                    searchParam="search"
                    activeParam="active"
                    sortMode="ordering"
                    orderingParam="ordering"
                    defaultSortField="display_name"
                    defaultSortOrder="ascend"
                    showSearch={false}
                    enableInactiveDrawer={false}
                    canAdd
                    canEdit
                    canDelete={false}
                    canView={false}
                    hasActions={false}
                    hasActionColumns={false}
                />
            </div>
        </AuthenticatedLayout>
    );
}