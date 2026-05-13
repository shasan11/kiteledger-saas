import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    Tabs, Card, Row, Col, Typography, Tag, Space, Button, Select, Table, Spin, Divider, Dropdown, theme,
} from 'antd';
import { PlusOutlined, CaretDownOutlined } from '@ant-design/icons';

dayjs.extend(customParseFormat);

const { Text, Title } = Typography;
const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const asId = (v) => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'object') return v.id ?? v.value ?? null; return v; };
const nullIfEmpty = (v) => (v === undefined || v === null || v === '') ? null : v;
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const formatDate = (v) => {
    if (!v) return null;
    if (dayjs.isDayjs(v)) return v.isValid() ? v.format('YYYY-MM-DD') : null;
    const d = dayjs(v);
    return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

const STATUS_COLORS = { pending: 'gold', cleared: 'green', bounced: 'red', cancelled: 'default' };
const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'cancelled', label: 'Cancelled' },
];
const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
];

function getPeriodDates(period) {
    const now = dayjs();
    switch (period) {
        case 'today':
            return { date_from: now.format('YYYY-MM-DD'), date_to: now.format('YYYY-MM-DD') };
        case 'week':
            return { date_from: now.startOf('week').format('YYYY-MM-DD'), date_to: now.endOf('week').format('YYYY-MM-DD') };
        case 'month':
            return { date_from: now.startOf('month').format('YYYY-MM-DD'), date_to: now.endOf('month').format('YYYY-MM-DD') };
        case 'last_month': {
            const lm = now.subtract(1, 'month');
            return { date_from: lm.startOf('month').format('YYYY-MM-DD'), date_to: lm.endOf('month').format('YYYY-MM-DD') };
        }
        case 'year':
            return { date_from: now.startOf('year').format('YYYY-MM-DD'), date_to: now.endOf('year').format('YYYY-MM-DD') };
        default:
            return {};
    }
}

// ─── Shared FK configs ────────────────────────────────────────────────────────

const accountFkBase = {
    type: 'fkSelect',
    fkUrl: api('/api/accounts/'),
    fkSearchParam: 'search',
    fkPageSize: 20,
    fkValueKey: 'id',
    fkLabelKey: 'name',
    fkLabel: (r) => [r?.code, r?.display_name || r?.name].filter(Boolean).join(' - '),
};

const bankFkBase = {
    ...accountFkBase,
    fkUrl: api('/api/accounts/?nature=bank&nature=cash'),
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ onGoToReceived, onGoToIssued }) {
    const { token } = theme.useToken();
    const [period, setPeriod] = useState('today');
    const [relatedAccountId, setRelatedAccountId] = useState(null);
    const [accountOptions, setAccountOptions] = useState([{ value: null, label: 'All' }]);
    const [stats, setStats] = useState({ received: 0, issued: 0 });
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND_BASE}/api/accounts/?page_size=100&active=true`)
            .then((r) => r.json())
            .then((data) => {
                const results = data.results ?? data.data ?? [];
                setAccountOptions([
                    { value: null, label: 'All' },
                    ...results.map((a) => ({ value: a.id, label: a.name || a.display_name || a.id })),
                ]);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const dates = getPeriodDates(period);

        const buildQs = (extra = {}) => {
            const p = new URLSearchParams({ page_size: 1, ...dates, ...extra });
            if (relatedAccountId) p.set('related_account_id', relatedAccountId);
            return p.toString();
        };

        const listQs = new URLSearchParams({ page_size: 20, ordering: '-cheque_date', ...dates });
        if (relatedAccountId) listQs.set('related_account_id', relatedAccountId);

        Promise.all([
            fetch(`${BACKEND_BASE}/api/cheque-registers/?${buildQs({ direction: 'received' })}`).then((r) => r.json()),
            fetch(`${BACKEND_BASE}/api/cheque-registers/?${buildQs({ direction: 'issued' })}`).then((r) => r.json()),
            fetch(`${BACKEND_BASE}/api/cheque-registers/?${listQs}`).then((r) => r.json()),
        ])
            .then(([recv, iss, list]) => {
                setStats({ received: recv.count ?? 0, issued: iss.count ?? 0 });
                setCheques(list.results ?? []);
            })
            .finally(() => setLoading(false));
    }, [period, relatedAccountId]);

    const dashColumns = [
        {
            title: 'DATE',
            dataIndex: 'cheque_date',
            key: 'cheque_date',
            width: 110,
            render: fmtDate,
        },
        {
            title: 'CHEQUE NO.',
            dataIndex: 'cheque_no',
            key: 'cheque_no',
            width: 140,
            render: (v) => <Text strong>{v || '-'}</Text>,
        },
        {
            title: 'ACCOUNT',
            key: 'account',
            render: (_, r) =>
                r?.relatedAccount?.name ||
                r?.related_account?.name ||
                r?.related_account_id_detail?.name ||
                '-',
        },
        {
            title: 'BANK',
            key: 'bank',
            render: (_, r) => r?.account?.name || r?.account_id_detail?.name || '-',
        },
        {
            title: 'AMOUNT',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            width: 160,
            render: (v, r) => (
                <Space size={4}>
                    <Tag
                        color={r.direction === 'received' ? 'green' : 'orange'}
                        style={{ marginInlineEnd: 0 }}
                    >
                        {r.direction === 'received' ? 'IN' : 'OUT'}
                    </Tag>
                    <Text>{money(v)}</Text>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ paddingTop: 16 }}>
            <Card size="small" style={{ marginBottom: 16, borderRadius: token.borderRadius }}>
                <Row gutter={24} align="middle" wrap>
                    <Col>
                        <Space>
                            <Text type="secondary">Period</Text>
                            <Select
                                value={period}
                                onChange={setPeriod}
                                options={PERIOD_OPTIONS}
                                style={{ width: 150 }}
                                suffixIcon={<CaretDownOutlined />}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Text type="secondary">Customer/Supplier</Text>
                            <Select
                                value={relatedAccountId}
                                onChange={setRelatedAccountId}
                                options={accountOptions}
                                style={{ width: 220 }}
                                showSearch
                                filterOption={(input, opt) =>
                                    String(opt?.label || '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Spin spinning={loading}>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12}>
                        <Card style={{ borderRadius: token.borderRadius }}>
                            <Row justify="space-between" align="top">
                                <Col>
                                    <Title
                                        level={1}
                                        style={{ color: token.colorSuccess, margin: 0, lineHeight: 1 }}
                                    >
                                        {stats.received}
                                    </Title>
                                    <Text type="secondary">{stats.received} Cheque Received</Text>
                                </Col>
                                <Col>
                                    <Button
                                        type="link"
                                        icon={<PlusOutlined />}
                                        onClick={onGoToReceived}
                                        style={{ paddingInline: 0 }}
                                    >
                                        ADD NEW
                                    </Button>
                                </Col>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Button type="link" onClick={onGoToReceived} style={{ padding: 0 }}>
                                VIEW ALL
                            </Button>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card style={{ borderRadius: token.borderRadius }}>
                            <Row justify="space-between" align="top">
                                <Col>
                                    <Title
                                        level={1}
                                        style={{ color: token.colorWarning, margin: 0, lineHeight: 1 }}
                                    >
                                        {stats.issued}
                                    </Title>
                                    <Text type="secondary">{stats.issued} Cheque Issued</Text>
                                </Col>
                                <Col>
                                    <Button
                                        type="link"
                                        icon={<PlusOutlined />}
                                        onClick={onGoToIssued}
                                        style={{ paddingInline: 0 }}
                                    >
                                        ADD NEW
                                    </Button>
                                </Col>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Button type="link" onClick={onGoToIssued} style={{ padding: 0 }}>
                                VIEW ALL
                            </Button>
                        </Card>
                    </Col>
                </Row>

                <Card
                    title={<Text strong>Cheque Lists</Text>}
                    style={{ borderRadius: token.borderRadius }}
                >
                    <Table
                        dataSource={cheques}
                        columns={dashColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'No cheques found for this period' }}
                    />
                </Card>
            </Spin>
        </div>
    );
}

// ─── Cheque Received Tab ──────────────────────────────────────────────────────

function ReceivedTab() {
    const columns = useMemo(
        () => [
            {
                title: 'CUSTOMER NAME',
                key: 'customer',
                render: (_, r) =>
                    r?.relatedAccount?.name ||
                    r?.related_account?.name ||
                    r?.related_account_id_detail?.name ||
                    '-',
            },
            {
                title: 'CHEQUE DATE',
                dataIndex: 'cheque_date',
                key: 'cheque_date',
                width: 120,
                render: fmtDate,
            },
            {
                title: 'RECEIVED DATE',
                dataIndex: 'received_date',
                key: 'received_date',
                width: 130,
                render: fmtDate,
            },
            {
                title: 'AMOUNT',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right',
                width: 130,
                render: money,
            },
            {
                title: 'CHEQUE NO.',
                dataIndex: 'cheque_no',
                key: 'cheque_no',
                width: 130,
                render: (v) => <Text strong>{v || '-'}</Text>,
            },
            {
                title: 'STATUS',
                dataIndex: 'status',
                key: 'status',
                width: 110,
                render: (v) => (
                    <Tag
                        color={STATUS_COLORS[v] || 'default'}
                        style={{ marginInlineEnd: 0 }}
                    >
                        {String(v || 'pending').toUpperCase()}
                    </Tag>
                ),
            },
        ],
        [],
    );

    const fields = useMemo(
        () => [
            {
                name: 'related_account_id',
                label: 'Customer / Account',
                required: true,
                col: 24,
                placeholder: 'Select Customer',
                ...accountFkBase,
            },
            {
                name: 'account_id',
                label: 'Select Bank',
                required: true,
                col: 24,
                placeholder: 'Select Bank Account',
                ...bankFkBase,
            },
            {
                name: 'cheque_no',
                label: 'Cheque Number',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Cheque Number',
            },
            {
                name: 'cheque_date',
                label: 'Cheque Date',
                type: 'datePicker',
                required: true,
                col: 12,
                format: 'DD-MM-YYYY',
            },
            {
                name: 'received_date',
                label: 'Received Date',
                type: 'datePicker',
                required: true,
                col: 12,
                format: 'DD-MM-YYYY',
            },
            {
                name: 'amount',
                label: 'Amount',
                type: 'number',
                required: true,
                col: 12,
                min: 0.01,
                placeholder: 'Amount',
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                col: 12,
                options: STATUS_OPTIONS,
            },
        ],
        [],
    );

    const validationSchema = useMemo(
        () =>
            Yup.object().shape({
                related_account_id: Yup.mixed()
                    .test('req', 'Customer is required', (v) => !!asId(v))
                    .required(),
                account_id: Yup.mixed()
                    .test('req', 'Bank account is required', (v) => !!asId(v))
                    .required(),
                cheque_no: Yup.string().required('Cheque number is required'),
                cheque_date: Yup.mixed().required('Cheque date is required'),
                received_date: Yup.mixed().required('Received date is required'),
                amount: Yup.number()
                    .min(0.01, 'Amount must be greater than zero')
                    .required('Amount is required'),
                status: Yup.string()
                    .oneOf(['pending', 'cleared', 'bounced', 'cancelled'])
                    .required('Status is required'),
            }),
        [],
    );

    const crudInitialValues = useMemo(
        () => ({
            direction: 'received',
            related_account_id: null,
            account_id: null,
            cheque_no: '',
            cheque_date: dayjs(),
            received_date: dayjs(),
            amount: 0,
            status: 'pending',
        }),
        [],
    );

    const transformPayload = useCallback((values = {}) => {
        const chequeDate = formatDate(values.cheque_date);
        return {
            direction: 'received',
            related_account_id: asId(values.related_account_id),
            receiver_related_account_id: asId(values.related_account_id),
            account_id: asId(values.account_id),
            cheque_no: nullIfEmpty(values.cheque_no),
            cheque_date: chequeDate,
            issued_date: chequeDate,
            received_date: formatDate(values.received_date) ?? chequeDate,
            amount: toNumber(values.amount),
            status: values.status || 'pending',
            exchange_rate: 1,
            total: toNumber(values.amount),
            active: true,
            approved: false,
        };
    }, []);

    return (
        <ReusableCrud
            title="Cheque Received"
            apiUrl={api('/api/cheque-registers/')}
            columns={columns}
            fields={fields}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformPayload={transformPayload}
            baseFilters={{ direction: 'received' }}
            form_ui="drawer"
            drawerWidth={520}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            enableServerPagination
            showSearch
            canAdd
            canEdit
            canDelete
            hasActions
            hasActionColumns
            anchorFilters={[
                { key: 'all', label: 'All', params: {} },
                { key: 'pending', label: 'Pending', params: { status: 'pending' } },
                { key: 'cleared', label: 'Cleared', params: { status: 'cleared' } },
                { key: 'bounced', label: 'Bounced', params: { status: 'bounced' } },
            ]}
            defaultAnchorKey="all"
            anchorSyncWithHash={false}
        />
    );
}

// ─── Cheque Issued Tab ────────────────────────────────────────────────────────

function IssuedTab() {
    const columns = useMemo(
        () => [
            {
                title: 'SUPPLIER NAME',
                key: 'supplier',
                render: (_, r) =>
                    r?.relatedAccount?.name ||
                    r?.related_account?.name ||
                    r?.related_account_id_detail?.name ||
                    '-',
            },
            {
                title: 'PAYEE NAME',
                dataIndex: 'payee_name',
                key: 'payee_name',
                render: (v) => v || '-',
            },
            {
                title: 'CHEQUE DATE',
                dataIndex: 'cheque_date',
                key: 'cheque_date',
                width: 120,
                render: fmtDate,
            },
            {
                title: 'ISSUED DATE',
                dataIndex: 'issued_date',
                key: 'issued_date',
                width: 120,
                render: fmtDate,
            },
            {
                title: 'AMOUNT',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right',
                width: 130,
                render: money,
            },
            {
                title: 'STATUS',
                dataIndex: 'status',
                key: 'status',
                width: 110,
                render: (v) => (
                    <Tag
                        color={STATUS_COLORS[v] || 'default'}
                        style={{ marginInlineEnd: 0 }}
                    >
                        {String(v || 'pending').toUpperCase()}
                    </Tag>
                ),
            },
        ],
        [],
    );

    const fields = useMemo(
        () => [
            {
                name: 'related_account_id',
                label: 'Supplier / Account',
                required: true,
                col: 24,
                placeholder: 'Select Supplier',
                ...accountFkBase,
            },
            {
                name: 'payee_name',
                label: 'Payee Name',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Payee Name',
            },
            {
                name: 'account_id',
                label: 'Bank Account',
                required: true,
                col: 24,
                placeholder: 'Select Bank Account',
                ...bankFkBase,
            },
            {
                name: 'cheque_no',
                label: 'Cheque Number',
                type: 'text',
                required: true,
                col: 24,
                placeholder: 'Cheque Number',
            },
            {
                name: 'cheque_date',
                label: 'Cheque Date',
                type: 'datePicker',
                required: true,
                col: 12,
                format: 'DD-MM-YYYY',
            },
            {
                name: 'issued_date',
                label: 'Issued Date',
                type: 'datePicker',
                required: true,
                col: 12,
                format: 'DD-MM-YYYY',
            },
            {
                name: 'amount',
                label: 'Amount',
                type: 'number',
                required: true,
                col: 12,
                min: 0.01,
                placeholder: 'Amount',
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                col: 12,
                options: STATUS_OPTIONS,
            },
        ],
        [],
    );

    const validationSchema = useMemo(
        () =>
            Yup.object().shape({
                related_account_id: Yup.mixed()
                    .test('req', 'Supplier is required', (v) => !!asId(v))
                    .required(),
                payee_name: Yup.string().required('Payee name is required'),
                account_id: Yup.mixed()
                    .test('req', 'Bank account is required', (v) => !!asId(v))
                    .required(),
                cheque_no: Yup.string().required('Cheque number is required'),
                cheque_date: Yup.mixed().required('Cheque date is required'),
                issued_date: Yup.mixed().required('Issued date is required'),
                amount: Yup.number()
                    .min(0.01, 'Amount must be greater than zero')
                    .required('Amount is required'),
                status: Yup.string()
                    .oneOf(['pending', 'cleared', 'bounced', 'cancelled'])
                    .required('Status is required'),
            }),
        [],
    );

    const crudInitialValues = useMemo(
        () => ({
            direction: 'issued',
            related_account_id: null,
            payee_name: '',
            account_id: null,
            cheque_no: '',
            cheque_date: dayjs(),
            issued_date: dayjs(),
            amount: 0,
            status: 'pending',
        }),
        [],
    );

    const transformPayload = useCallback((values = {}) => {
        const chequeDate = formatDate(values.cheque_date);
        return {
            direction: 'issued',
            related_account_id: asId(values.related_account_id),
            account_id: asId(values.account_id),
            payee_name: nullIfEmpty(values.payee_name),
            cheque_no: nullIfEmpty(values.cheque_no),
            cheque_date: chequeDate,
            issued_date: formatDate(values.issued_date) ?? chequeDate,
            received_date: null,
            amount: toNumber(values.amount),
            status: values.status || 'pending',
            exchange_rate: 1,
            total: toNumber(values.amount),
            active: true,
            approved: false,
        };
    }, []);

    return (
        <ReusableCrud
            title="Cheque Issued"
            apiUrl={api('/api/cheque-registers/')}
            columns={columns}
            fields={fields}
            validationSchema={validationSchema}
            crudInitialValues={crudInitialValues}
            transformPayload={transformPayload}
            baseFilters={{ direction: 'issued' }}
            form_ui="drawer"
            drawerWidth={520}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            enableServerPagination
            showSearch
            canAdd
            canEdit
            canDelete
            hasActions
            hasActionColumns
            anchorFilters={[
                { key: 'all', label: 'All', params: {} },
                { key: 'pending', label: 'Pending', params: { status: 'pending' } },
                { key: 'cleared', label: 'Cleared', params: { status: 'cleared' } },
                { key: 'bounced', label: 'Bounced', params: { status: 'bounced' } },
            ]}
            defaultAnchorKey="all"
            anchorSyncWithHash={false}
        />
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChequeRegisters({ auth }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    const addMenuItems = [
        { key: 'received', label: 'Cheque Received', onClick: () => setActiveTab('received') },
        { key: 'issued', label: 'Cheque Issued', onClick: () => setActiveTab('issued') },
    ];

    const tabBarExtra = (
        <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
            <Button type="primary" icon={<PlusOutlined />}>
                ADD NEW <CaretDownOutlined />
            </Button>
        </Dropdown>
    );

    const tabItems = [
        {
            key: 'dashboard',
            label: 'Dashboard',
            children: (
                <DashboardTab
                    onGoToReceived={() => setActiveTab('received')}
                    onGoToIssued={() => setActiveTab('issued')}
                />
            ),
        },
        {
            key: 'received',
            label: 'Cheque Received',
            children: <ReceivedTab />,
        },
        {
            key: 'issued',
            label: 'Cheque Issued',
            children: <IssuedTab />,
        },
    ];

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Cheque Register" />
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                tabBarExtraContent={tabBarExtra}
                destroyInactiveTabPane={false}
            />
        </AuthenticatedLayout>
    );
}
