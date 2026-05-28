import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import { Head } from '@inertiajs/react';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    Tabs, Row, Col, Typography, Tag, Space, Button, Select, Table, Spin, Divider, Dropdown, theme,
    message,
} from 'antd';
import { PlusOutlined, CaretDownOutlined, ArrowRightOutlined } from '@ant-design/icons';

dayjs.extend(customParseFormat);

const { Text } = Typography;
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

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'cleared', label: 'Cleared' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'cancelled', label: 'Cancelled' },
];
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

function InlineChequeStatus({ record }) {
    const [value, setValue] = useState(record?.status || 'pending');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(record?.status || 'pending');
    }, [record?.id, record?.status]);

    const updateStatus = async (nextStatus) => {
        const previous = value;
        setValue(nextStatus);
        setSaving(true);
        try {
            await fetch(`${BACKEND_BASE}/api/cheque-registers/${record.id}`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ status: nextStatus }),
            }).then(async (response) => {
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.message || 'Failed to update cheque status.');
                }
                return response.json();
            });

            const refreshed = await fetch(`${BACKEND_BASE}/api/cheque-registers/${record.id}`, {
                headers: { Accept: 'application/json', ...getAuthHeaders() },
            }).then((response) => response.json()).catch(() => null);

            if (refreshed) {
                record.status = refreshed?.data?.status || refreshed?.status || nextStatus;
                setValue(record.status);
            }
            message.success('Cheque status updated.');
        } catch (error) {
            setValue(previous);
            message.error(error?.message || 'Failed to update cheque status.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Select
            size="small"
            value={value}
            loading={saving}
            style={{ width: 118 }}
            options={STATUS_OPTIONS}
            onChange={updateStatus}
        />
    );
}
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
    fkLabel: (r) => [r?.code, r?.display_name || r?.name].filter(Boolean).join(' — '),
};

const bankFkBase = {
    ...accountFkBase,
    fkUrl: api('/api/accounts/?nature=bank'),
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ count, label, accentColor, bgColor, borderColor, onAdd, onViewAll, token }) {
    return (
        <div style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: token.borderRadiusLG,
            padding: `${token.paddingSM}px ${token.padding}px`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{
                        fontSize: 32,
                        fontWeight: token.fontWeightStrong,
                        color: accentColor,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {count}
                    </div>
                    <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                        {label}
                    </Text>
                </div>
                <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={onAdd}
                    style={{ color: accentColor, fontSize: token.fontSizeSM, fontWeight: 600 }}
                >
                    ADD NEW
                </Button>
            </div>
            <Divider style={{ margin: `${token.paddingXS}px 0` }} />
            <Button
                type="link"
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={onViewAll}
                style={{ padding: 0, height: 'auto', fontSize: token.fontSizeSM, color: accentColor }}
            >
                VIEW ALL
            </Button>
        </div>
    );
}

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

    const dashColumns = useMemo(() => [
        {
            title: 'Date',
            dataIndex: 'cheque_date',
            key: 'cheque_date',
            width: 100,
            render: (v) => (
                <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                    {fmtDate(v)}
                </Text>
            ),
        },
        {
            title: 'Cheque No.',
            dataIndex: 'cheque_no',
            key: 'cheque_no',
            width: 130,
            render: (v) => (
                <Text strong style={{ fontSize: token.fontSizeSM }}>
                    {v || '—'}
                </Text>
            ),
        },
        {
            title: 'Account',
            key: 'account',
            render: (_, r) => (
                <Text style={{ fontSize: token.fontSizeSM }}>
                    {r?.relatedAccount?.name || r?.related_account?.name || r?.related_account_id_detail?.name || '—'}
                </Text>
            ),
        },
        {
            title: 'Bank',
            key: 'bank',
            render: (_, r) => (
                <Text style={{ fontSize: token.fontSizeSM }}>
                    {r?.account?.name || r?.account_id_detail?.name || '—'}
                </Text>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            width: 150,
            render: (v, r) => (
                <Space size={4}>
                    <Tag
                        color={r.direction === 'received' ? 'success' : 'warning'}
                        style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                    >
                        {r.direction === 'received' ? 'IN' : 'OUT'}
                    </Tag>
                    <Text strong style={{ fontSize: token.fontSizeSM, fontVariantNumeric: 'tabular-nums' }}>
                        {money(v)}
                    </Text>
                </Space>
            ),
        },
    ], [token]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: token.paddingSM }}>

            {/* ── Filter strip ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: token.padding,
                flexWrap: 'wrap',
                padding: `${token.paddingXS}px ${token.paddingSM}px`,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
            }}>
                <Space size={6}>
                    <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>
                        Period
                    </Text>
                    <Select
                        size="small"
                        value={period}
                        onChange={setPeriod}
                        options={PERIOD_OPTIONS}
                        style={{ width: 130 }}
                        suffixIcon={<CaretDownOutlined style={{ fontSize: 10 }} />}
                    />
                </Space>
                <div style={{ width: 1, height: 18, background: token.colorBorderSecondary }} />
                <Space size={6}>
                    <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, whiteSpace: 'nowrap' }}>
                        Customer / Supplier
                    </Text>
                    <Select
                        size="small"
                        value={relatedAccountId}
                        onChange={setRelatedAccountId}
                        options={accountOptions}
                        style={{ width: 200 }}
                        showSearch
                        filterOption={(input, opt) =>
                            String(opt?.label || '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Space>
            </div>

            <Spin spinning={loading}>
                {/* ── Stat cards ── */}
                <Row gutter={[token.paddingSM, token.paddingSM]} style={{ marginBottom: token.paddingSM }}>
                    <Col xs={24} sm={12}>
                        <StatCard
                            count={stats.received}
                            label={`${stats.received} Cheque${stats.received !== 1 ? 's' : ''} Received`}
                            accentColor={token.colorSuccess}
                            bgColor={token.colorSuccessBg}
                            borderColor={token.colorSuccessBorder}
                            onAdd={onGoToReceived}
                            onViewAll={onGoToReceived}
                            token={token}
                        />
                    </Col>
                    <Col xs={24} sm={12}>
                        <StatCard
                            count={stats.issued}
                            label={`${stats.issued} Cheque${stats.issued !== 1 ? 's' : ''} Issued`}
                            accentColor={token.colorWarning}
                            bgColor={token.colorWarningBg}
                            borderColor={token.colorWarningBorder}
                            onAdd={onGoToIssued}
                            onViewAll={onGoToIssued}
                            token={token}
                        />
                    </Col>
                </Row>

                {/* ── Cheque list ── */}
                <div style={{
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: `${token.paddingXS}px ${token.paddingSM}px`,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        background: token.colorFillAlter,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <Text strong style={{ fontSize: token.fontSize }}>Cheque Lists</Text>
                        <Text style={{ fontSize: token.fontSizeSM, color: token.colorTextTertiary }}>
                            {cheques.length} record{cheques.length !== 1 ? 's' : ''}
                        </Text>
                    </div>
                    <Table
                        dataSource={cheques}
                        columns={dashColumns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 600 }}
                        locale={{ emptyText: 'No cheques for this period' }}
                        style={{ fontSize: token.fontSizeSM }}
                    />
                </div>
            </Spin>
        </div>
    );
}

// ─── Cheque Received Tab ──────────────────────────────────────────────────────

function ReceivedTab() {
    const { token } = theme.useToken();

    const columns = useMemo(() => [
        {
            title: 'Customer',
            key: 'customer',
            render: (_, r) =>
                r?.relatedAccount?.name ||
                r?.related_account?.name ||
                r?.related_account_id_detail?.name ||
                '—',
        },
        {
            title: 'Cheque No.',
            dataIndex: 'cheque_no',
            key: 'cheque_no',
            width: 130,
            render: (v) => <Text strong style={{ fontSize: token.fontSizeSM }}>{v || '—'}</Text>,
        },
        {
            title: 'Cheque Date',
            dataIndex: 'cheque_date',
            key: 'cheque_date',
            width: 110,
            render: fmtDate,
        },
        {
            title: 'Received Date',
            dataIndex: 'received_date',
            key: 'received_date',
            width: 120,
            render: fmtDate,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            width: 130,
            render: (v) => (
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (_, record) => <InlineChequeStatus record={record} />,
        },
    ], [token]);

    const fields = useMemo(() => [
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
        { name: 'cheque_no', label: 'Cheque Number', type: 'text', required: true, col: 24, placeholder: 'Cheque Number' },
        { name: 'cheque_date', label: 'Cheque Date', type: 'datePicker', required: true, col: 12, format: 'DD-MM-YYYY' },
        { name: 'received_date', label: 'Received Date', type: 'datePicker', required: true, col: 12, format: 'DD-MM-YYYY' },
        { name: 'amount', label: 'Amount', type: 'number', required: true, col: 12, min: 0.01, placeholder: 'Amount' },
        { name: 'status', label: 'Status', type: 'select', required: true, col: 12, options: STATUS_OPTIONS },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        related_account_id: Yup.mixed().test('req', 'Customer is required', (v) => !!asId(v)).required(),
        account_id: Yup.mixed().test('req', 'Bank account is required', (v) => !!asId(v)).required(),
        cheque_no: Yup.string().required('Cheque number is required'),
        cheque_date: Yup.mixed().required('Cheque date is required'),
        received_date: Yup.mixed().required('Received date is required'),
        amount: Yup.number().min(0.01, 'Amount must be greater than zero').required('Amount is required'),
        status: Yup.string().oneOf(['pending', 'cleared', 'bounced', 'cancelled']).required('Status is required'),
    }), []);

    const crudInitialValues = useMemo(() => ({
        direction: 'received',
        related_account_id: null,
        account_id: null,
        cheque_no: '',
        cheque_date: dayjs(),
        received_date: dayjs(),
        amount: 0,
        status: 'pending',
    }), []);

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
            drawerWidth={500}
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
    const { token } = theme.useToken();

    const columns = useMemo(() => [
        {
            title: 'Supplier',
            key: 'supplier',
            render: (_, r) =>
                r?.relatedAccount?.name ||
                r?.related_account?.name ||
                r?.related_account_id_detail?.name ||
                '—',
        },
        {
            title: 'Payee Name',
            dataIndex: 'payee_name',
            key: 'payee_name',
            render: (v) => v || '—',
        },
        {
            title: 'Cheque No.',
            dataIndex: 'cheque_no',
            key: 'cheque_no',
            width: 130,
            render: (v) => <Text strong style={{ fontSize: token.fontSizeSM }}>{v || '—'}</Text>,
        },
        {
            title: 'Cheque Date',
            dataIndex: 'cheque_date',
            key: 'cheque_date',
            width: 110,
            render: fmtDate,
        },
        {
            title: 'Issued Date',
            dataIndex: 'issued_date',
            key: 'issued_date',
            width: 110,
            render: fmtDate,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            width: 130,
            render: (v) => (
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (_, record) => <InlineChequeStatus record={record} />,
        },
    ], [token]);

    const fields = useMemo(() => [
        {
            name: 'related_account_id',
            label: 'Supplier / Account',
            required: true,
            col: 24,
            placeholder: 'Select Supplier',
            ...accountFkBase,
        },
        { name: 'payee_name', label: 'Payee Name', type: 'text', required: true, col: 24, placeholder: 'Payee Name' },
        {
            name: 'account_id',
            label: 'Bank Account',
            required: true,
            col: 24,
            placeholder: 'Select Bank Account',
            ...bankFkBase,
        },
        { name: 'cheque_no', label: 'Cheque Number', type: 'text', required: true, col: 24, placeholder: 'Cheque Number' },
        { name: 'cheque_date', label: 'Cheque Date', type: 'datePicker', required: true, col: 12, format: 'DD-MM-YYYY' },
        { name: 'issued_date', label: 'Issued Date', type: 'datePicker', required: true, col: 12, format: 'DD-MM-YYYY' },
        { name: 'amount', label: 'Amount', type: 'number', required: true, col: 12, min: 0.01, placeholder: 'Amount' },
        { name: 'status', label: 'Status', type: 'select', required: true, col: 12, options: STATUS_OPTIONS },
    ], []);

    const validationSchema = useMemo(() => Yup.object().shape({
        related_account_id: Yup.mixed().test('req', 'Supplier is required', (v) => !!asId(v)).required(),
        payee_name: Yup.string().required('Payee name is required'),
        account_id: Yup.mixed().test('req', 'Bank account is required', (v) => !!asId(v)).required(),
        cheque_no: Yup.string().required('Cheque number is required'),
        cheque_date: Yup.mixed().required('Cheque date is required'),
        issued_date: Yup.mixed().required('Issued date is required'),
        amount: Yup.number().min(0.01, 'Amount must be greater than zero').required('Amount is required'),
        status: Yup.string().oneOf(['pending', 'cleared', 'bounced', 'cancelled']).required('Status is required'),
    }), []);

    const crudInitialValues = useMemo(() => ({
        direction: 'issued',
        related_account_id: null,
        payee_name: '',
        account_id: null,
        cheque_no: '',
        cheque_date: dayjs(),
        issued_date: dayjs(),
        amount: 0,
        status: 'pending',
    }), []);

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
            drawerWidth={500}
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
    const { token } = theme.useToken();
    const [activeTab, setActiveTab] = useState('dashboard');

    const addMenuItems = [
        { key: 'received', label: 'Cheque Received', onClick: () => setActiveTab('received') },
        { key: 'issued', label: 'Cheque Issued', onClick: () => setActiveTab('issued') },
    ];

    const tabBarExtra = (
        <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
            <Button type="primary" size="small" icon={<PlusOutlined />} style={{ fontSize: token.fontSizeSM }}>
                ADD NEW <CaretDownOutlined />
            </Button>
        </Dropdown>
    );

    const wrap = (children, pad = true) => (
        <div style={{
            padding: pad ? token.padding : 0,
            background: token.colorBgLayout,
            minHeight: 300,
        }}>
            {children}
        </div>
    );

    const tabItems = [
        {
            key: 'dashboard',
            label: 'Dashboard',
            children: wrap(
                <DashboardTab
                    onGoToReceived={() => setActiveTab('received')}
                    onGoToIssued={() => setActiveTab('issued')}
                />,
            ),
        },
        { key: 'received', label: 'Cheque Received', children: wrap(<ReceivedTab />, false) },
        { key: 'issued', label: 'Cheque Issued', children: wrap(<IssuedTab />, false) },
    ];

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title="Cheque Register" />
            <div style={{
                background: token.colorBgContainer,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                overflow: 'hidden',
            }}>
                {/* Page header */}
                <div style={{
                    padding: `${token.paddingXS + 2}px ${token.padding}px`,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: token.padding,
                    background: token.colorBgContainer,
                }}>
                    <Text strong style={{ fontSize: token.fontSizeLG, color: token.colorText }}>
                        Cheque Register
                    </Text>
                    {tabBarExtra}
                </div>

                {/* Tabs (bar + content) */}
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    destroyInactiveTabPane={false}
                    tabBarStyle={{
                        margin: 0,
                        paddingInline: token.padding,
                        background: token.colorBgContainer,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    }}
                />
            </div>
        </AuthenticatedLayout>
    );
}
