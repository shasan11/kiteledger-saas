import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ResuableCrud';
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
    CreditCardOutlined,
    WalletOutlined,
    MoreOutlined,
    CopyOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Dropdown,
    Empty,
    Input,
    message,
    Pagination,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
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
        console.warn('Clipboard API failed, using fallback.', error);
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

export default function BankAccounts(props) {
    const apiUrl = api('/api/bank-accounts/');
    const { currency, formatMoney } = useMoneyFormatter();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 12,
        total: 0,
    });

    const [formKey, setFormKey] = useState(0);
    const [formMode, setFormMode] = useState('add');
    const [editId, setEditId] = useState(null);

    const fetchRows = useCallback(
        async ({ page, pageSize, search, type, active } = {}) => {
            try {
                setLoading(true);

                const url = appendQueryParams(apiUrl, {
                    page: page ?? pagination.current,
                    page_size: pageSize ?? pagination.pageSize,
                    search: search ?? searchText,
                    type: type ?? typeFilter,
                    active: (active ?? activeFilter) === 'all' ? undefined : active ?? activeFilter,
                    ordering: '-created_at',
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
        fetchRows();
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
                {
                    active: false,
                },
                {
                    headers: getAuthHeaders(),
                },
            );

            message.success('Bank account deactivated.');
            fetchRows();
        } catch (error) {
            console.error(error);
            message.error('Failed to deactivate bank account.');
        }
    };

    const restoreRecord = async (record) => {
        try {
            await axios.put(
                `${apiUrl.replace(/\/+$/, '')}/${record.id}`,
                {
                    active: true,
                },
                {
                    headers: getAuthHeaders(),
                },
            );

            message.success('Bank account restored.');
            fetchRows();
        } catch (error) {
            console.error(error);
            message.error('Failed to restore bank account.');
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

        try {
            const copied = await copyText(text);

            if (copied) {
                message.success('Bank account details copied.');
            } else {
                message.error('Failed to copy bank account details.');
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to copy bank account details.');
        }
    };

    const accountTypeCard = ({ values, setFieldValue, readOnly }) => {
        const selected = values?.type;

        const items = [
            {
                value: 'bank',
                label: 'Bank',
                icon: <BankOutlined />,
            },
            {
                value: 'cash',
                label: 'Cash',
                icon: <WalletOutlined />,
            },
        ];

        return (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                                width: 220,
                                height: 68,
                                border: active
                                    ? '1px solid #1d4ed8'
                                    : '1px solid #d9dee7',
                                background: active ? '#ffffff' : '#f1f4f8',
                                color: '#0f172a',
                                cursor: readOnly ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 18,
                                padding: '0 22px',
                                fontSize: 16,
                                fontWeight: 500,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 17,
                                    color: active ? '#334155' : '#94a3b8',
                                    display: 'inline-flex',
                                }}
                            >
                                {item.icon}
                            </span>

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
                fontSize: 16,
                fontWeight: 700,
                color: '#9ca3af',
                marginTop: 4,
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
                label: 'Type of Account',
                type: 'custom',
                required: true,
                col: 24,
                render: accountTypeCard,
            },
            {
                name: 'bank_name',
                label: 'Select Bank',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Select Bank / Enter Bank Name',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'display_name',
                label: 'Display Name',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Display Name',
            },
            {
                name: 'code',
                label: 'Code',
                type: 'text',
                readOnly: true,
                col: 12,
                placeholder: '#Auto-generated by system',
            },
            {
                name: 'currency_id',
                label: 'Currency Code',
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
                placeholder: 'Account Name',
                condition: (values) => values?.type === 'bank',
            },
            {
                name: 'account_number',
                label: 'Account Number',
                type: 'text',
                col: 12,
                placeholder: 'Account Number',
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
                placeholder: 'Swift Code',
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
        type: Yup.string()
            .oneOf(['bank', 'cash'])
            .required('Type of Account is required'),

        display_name: Yup.string()
            .trim()
            .max(150, 'Display name cannot exceed 150 characters')
            .required('Display Name is required'),

        currency_id: Yup.mixed()
            .nullable()
            .required('Currency is required'),

        bank_name: Yup.string().when('type', {
            is: 'bank',
            then: (schema) =>
                schema
                    .trim()
                    .max(150, 'Bank name cannot exceed 150 characters')
                    .required('Bank is required'),
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
        const currency = values?.currency_id_detail;

        if (currency) {
            const label =
                currency.label ||
                [currency.code, currency.name].filter(Boolean).join(' - ') ||
                currency.name ||
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

    const renderCardActions = (record) => {
        const items = [
            {
                key: 'copy',
                label: 'Copy Details',
                icon: <CopyOutlined />,
                onClick: () => handleCopyBankAccountInfo(record),
            },
            {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => openEditForm(record),
            },
            {
                key: 'statement',
                label: 'View Statement',
                onClick: () => router.visit(route('accounting.bank-accounts.show', record.id)),
            },
            {
                key: 'ledger',
                label: 'View Ledger',
                onClick: () => router.visit(route('accounting.bank-accounts.show', record.id)),
            },
            {
                key: 'reconcile',
                label: 'Reconcile',
                onClick: () => router.visit(route('accounting.bank-accounts.show', record.id)),
            },
        ];

        return (
            <Dropdown
                menu={{
                    items,
                    onClick: ({ key }) => {
                        const item = items.find((x) => x.key === key);
                        item?.onClick?.();
                    },
                }}
                trigger={['click']}
            >
                <Button icon={<MoreOutlined />} onClick={(event) => event.stopPropagation()} />
            </Dropdown>
        );
    };

    return (
        <AuthenticatedLayout user={props.auth?.user}>
            <Head title="Bank Accounts" />

            <div
                style={{
                    padding: 16,
                    background: '#f5f7fb',
                    minHeight: '100vh',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Bank Accounts
                        </Title>

                        <Text type="secondary">
                            Manage Bank And Cash Accounts
                        </Text>
                    </div>

                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={() => fetchRows()}>
                            Reload
                        </Button>

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openAddForm}
                        >
                            Add Bank Account
                        </Button>
                    </Space>
                </div>

                <Card
                    style={{
                        marginBottom: 16,
                        borderRadius: 4,
                    }}
                    bodyStyle={{
                        padding: 12,
                    }}
                >
                    <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space wrap>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Search bank, code, account number..."
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                onPressEnter={() =>
                                    fetchRows({
                                        page: 1,
                                        search: searchText,
                                    })
                                }
                                style={{ width: 320 }}
                            />

                            <Select
                                allowClear
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
                                style={{ width: 160 }}
                                options={[
                                    { value: 'bank', label: 'Bank' },
                                    { value: 'cash', label: 'Cash' },
                                ]}
                            />

                            <Select
                                value={activeFilter}
                                onChange={(value) => {
                                    setActiveFilter(value);
                                    fetchRows({
                                        page: 1,
                                        active: value,
                                    });
                                }}
                                style={{ width: 160 }}
                                options={[
                                    { value: 'true', label: 'Active Bank Accounts' },
                                    { value: 'false', label: 'Inactive Bank Accounts' },
                                    { value: 'all', label: 'All Bank Accounts' },
                                ]}
                            />
                        </Space>

                        <Button
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
                    </Space>
                </Card>

                <Spin spinning={loading}>
                    {rows.length < 1 ? (
                        <Card>
                            <Empty description="No bank accounts found" />
                        </Card>
                    ) : (
                        <Row gutter={[16, 16]}>
                            {rows.map((record) => {
                                const isBank = record.type === 'bank';

                                const currencyLabel = getLabel(
                                    record?.currency_name,
                                    record?.currency?.label,
                                    record?.currency?.code,
                                    record?.currency?.name,
                                );

                                return (
                                    <Col xs={24} sm={24} md={12} lg={8} xl={8} key={record.id}>
                                        <Card
                                            hoverable
                                            onClick={() => router.visit(route('accounting.bank-accounts.show', record.id))}
                                            style={{
                                                height: '100%',
                                                borderRadius: 6,
                                                border: '1px solid #e5e7eb',
                                            }}
                                            bodyStyle={{
                                                padding: 16,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    alignItems: 'flex-start',
                                                    marginBottom: 14,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: 10,
                                                        alignItems: 'center',
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 42,
                                                            height: 42,
                                                            borderRadius: 6,
                                                            background: isBank
                                                                ? '#e6f4ff'
                                                                : '#f6ffed',
                                                            color: isBank
                                                                ? '#1677ff'
                                                                : '#389e0d',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 20,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {isBank ? (
                                                            <BankOutlined />
                                                        ) : (
                                                            <WalletOutlined />
                                                        )}
                                                    </div>

                                                    <div style={{ minWidth: 0 }}>
                                                        <Text
                                                            strong
                                                            style={{
                                                                display: 'block',
                                                                fontSize: 15,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                        >
                                                            {record.display_name}
                                                        </Text>

                                                        <Text type="secondary">
                                                            {record.code || '-'}
                                                        </Text>
                                                    </div>
                                                </div>

                                                {renderCardActions(record)}
                                            </div>

                                            <Space wrap style={{ marginBottom: 12 }}>
                                                <Tag color={isBank ? 'blue' : 'green'}>
                                                    {isBank ? 'Bank' : 'Cash'}
                                                </Tag>

                                                <Tag>{currency?.code || 'Base'} balance</Tag>
                                                {record.account_id ? null : <Tag color="warning">Missing linked account</Tag>}
                                            </Space>

                                            <div
                                                style={{
                                                    borderTop: '1px solid #f0f0f0',
                                                    paddingTop: 12,
                                                    display: 'grid',
                                                    gap: 8,
                                                }}
                                            >
                                                <div>
                                                    <Text type="secondary">Currency</Text>
                                                    <br />
                                                    <Text strong>{currencyLabel}</Text>
                                                </div>

                                                <div>
                                                    <Text type="secondary">Opening Balance</Text>
                                                    <br />
                                                    <Text strong>{formatMoney(record.opening_balance)}</Text>
                                                </div>

                                                <div>
                                                    <Text type="secondary">Current Balance</Text>
                                                    <br />
                                                    <Text strong>{formatMoney(record.current_balance ?? record.software_ledger_balance ?? record.opening_balance)}</Text>
                                                </div>

                                                {isBank ? (
                                                    <>
                                                        <div>
                                                            <Text type="secondary">Bank Name</Text>
                                                            <br />
                                                            <Text>{record.bank_name || '-'}</Text>
                                                        </div>

                                                        <div>
                                                            <Text type="secondary">
                                                                Account Number
                                                            </Text>
                                                            <br />
                                                            <Text copyable={!!record.account_number}>
                                                                {record.account_number || '-'}
                                                            </Text>
                                                        </div>

                                                        <div>
                                                            <Text type="secondary">Swift Code</Text>
                                                            <br />
                                                            <Text>{record.swift_code || '-'}</Text>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 16,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    gap: 8,
                                                }}
                                            >
                                                <Button
                                                    block
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        router.visit(route('accounting.bank-accounts.show', record.id));
                                                    }}
                                                >
                                                    View Details
                                                </Button>

                                                <Button
                                                    block
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        router.visit(route('accounting.bank-accounts.show', record.id));
                                                    }}
                                                >
                                                    Statement
                                                </Button>

                                                <Button onClick={(event) => { event.stopPropagation(); router.visit(route('accounting.bank-accounts.show', record.id)); }}>Ledger</Button>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </Spin>

                <div
                    style={{
                        marginTop: 18,
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    <Pagination
                        current={pagination.current}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        showSizeChanger
                        pageSizeOptions={[8, 12, 24, 48]}
                        onChange={(page, pageSize) => {
                            setPagination((prev) => ({
                                ...prev,
                                current: page,
                                pageSize,
                            }));

                            fetchRows({
                                page,
                                pageSize,
                            });
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'none' }}>
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
                    modalWidth={760}
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
                    defaultSortField="created_at"
                    defaultSortOrder="descend"
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
