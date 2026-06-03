import { useCallback, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import axios from 'axios';
import dayjs from 'dayjs';
import {
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Typography,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Text, Title } = Typography;
const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api  = (path) => `${BACKEND}${path}`;

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const money = (val) =>
    Number(val || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDateTime = (value) => {
    if (!value) return '-';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD MMM YYYY, hh:mm A') : String(value);
};

const acctLabel = (row) =>
    [row?.code, row?.name || row?.display_name].filter(Boolean).join(' – ') || row?.id || '';

const getError = (err, fallback) => {
    const errs = err?.response?.data?.errors;
    if (errs) {
        const first = Object.values(errs).flat()[0];
        if (first) return first;
    }
    return err?.response?.data?.message || fallback;
};

export default function LoanAccountShow({ id }) {
    const { message: msg } = App.useApp();
    const { token } = theme.useToken();
    const [paybackForm] = Form.useForm();

    const [record,          setRecord]          = useState(null);
    const [paybacks,        setPaybacks]        = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [paybacksLoading, setPaybacksLoading] = useState(false);
    const [paybackOpen,     setPaybackOpen]     = useState(false);
    const [paybackSaving,   setPaybackSaving]   = useState(false);
    const [accountOptions,  setAccountOptions]  = useState([]);
    const [accountLoading,  setAccountLoading]  = useState(false);
    const [activeTab,       setActiveTab]       = useState('overview');

    /* ── data loaders ─────────────────────────────────────────────── */
    const loadRecord = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await axios.get(api(`/api/loan-accounts/${id}`), { headers: authHeaders() });
            setRecord(res.data?.data || res.data);
        } catch (e) {
            msg.error(getError(e, 'Failed to load loan account.'));
        } finally {
            setLoading(false);
        }
    }, [id, msg]);

    const loadPaybacks = useCallback(async () => {
        if (!id) return;
        setPaybacksLoading(true);
        try {
            const res = await axios.get(api(`/api/loan-accounts/${id}/paybacks`), { headers: authHeaders() });
            setPaybacks(res.data?.data || []);
        } catch (e) {
            msg.error(getError(e, 'Failed to load repayment records.'));
        } finally {
            setPaybacksLoading(false);
        }
    }, [id, msg]);

    const loadAccounts = useCallback(async (search = '') => {
        setAccountLoading(true);
        try {
            const res = await axios.get(api('/api/accounts/'), {
                headers: authHeaders(),
                params: { search, active: true, page_size: 30, ordering: 'code' },
            });
            const rows = res.data?.results || res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setAccountOptions(rows.map((r) => ({ value: r.id, label: acctLabel(r) })));
        } catch {
            // silently fail – user can still type
        } finally {
            setAccountLoading(false);
        }
    }, []);

    useEffect(() => { void loadRecord();   }, [loadRecord]);
    useEffect(() => { void loadPaybacks(); }, [loadPaybacks]);
    useEffect(() => { void loadAccounts(); }, [loadAccounts]);

    /* ── payback actions ──────────────────────────────────────────── */
    const openPaybackModal = () => {
        paybackForm.resetFields();
        paybackForm.setFieldsValue({ payback_date: dayjs() });
        setPaybackOpen(true);
    };

    const submitPayback = async () => {
        const values = await paybackForm.validateFields().catch(() => null);
        if (!values) return;
        setPaybackSaving(true);
        try {
            await axios.post(
                api(`/api/loan-accounts/${id}/paybacks`),
                {
                    payback_date:         values.payback_date?.format('YYYY-MM-DD'),
                    amount:               values.amount,
                    paid_from_account_id: values.paid_from_account_id,
                    reference:            values.reference || null,
                    notes:                values.notes    || null,
                },
                { headers: authHeaders() },
            );
            msg.success('Principal repayment recorded successfully.');
            setPaybackOpen(false);
            paybackForm.resetFields();
            await Promise.all([loadRecord(), loadPaybacks()]);
        } catch (e) {
            msg.error(getError(e, 'Failed to record repayment. Please check the details and try again.'));
        } finally {
            setPaybackSaving(false);
        }
    };

    const voidPayback = async (payback) => {
        try {
            await axios.delete(
                api(`/api/loan-accounts/${id}/paybacks/${payback.id}`),
                { headers: authHeaders() },
            );
            msg.success('Repayment record voided.');
            await Promise.all([loadRecord(), loadPaybacks()]);
        } catch (e) {
            msg.error(getError(e, 'Failed to void repayment.'));
        }
    };

    /* ── derived values ───────────────────────────────────────────── */
    const activePaybacks = paybacks.filter((p) => p.active);
    const charges = record?.loan_charges || record?.loanCharges || [];
    const topups = record?.loan_top_ups || record?.loanTopUps || [];
    const activeCharges = charges.filter((row) => row?.active !== false && !row?.void);
    const activeTopups = topups.filter((row) => row?.active !== false && !row?.void);
    const totalRepaid    = activePaybacks.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalCharges   = activeCharges.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalTopups    = activeTopups.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding    = Number(record?.current_balance ?? 0);

    const statusColor = { active: 'success', settled: 'processing', closed: 'default', cancelled: 'error' };

    /* ── table columns ────────────────────────────────────────────── */
    const paybackColumns = [
        { title: 'Date',      dataIndex: 'payback_date', width: 180, render: formatDateTime },
        {
            title: 'Amount', dataIndex: 'amount', align: 'right', width: 130,
            render: (v) => <Text strong>{money(v)}</Text>,
        },
        {
            title: 'Paid From Account',
            render: (_, r) => r.paid_from_account ? acctLabel(r.paid_from_account) : (r.paid_from_account_id || '-'),
        },
        { title: 'Reference', dataIndex: 'reference', render: (v) => v || '-' },
        { title: 'Notes',     dataIndex: 'notes',     render: (v) => v || '-' },
        {
            title: 'Status', dataIndex: 'active', width: 90,
            render: (v) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Voided'}</Tag>,
        },
        {
            title: 'Action', width: 90, align: 'center',
            render: (_, row) =>
                row.active ? (
                    <Popconfirm
                        title="Void this repayment?"
                        description="This will reverse the repayment and restore the outstanding balance."
                        onConfirm={() => voidPayback(row)}
                        okText="Void"
                        okButtonProps={{ danger: true }}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>Void</Button>
                    </Popconfirm>
                ) : (
                    <Tag>Voided</Tag>
                ),
        },
    ];

    /* ── render ───────────────────────────────────────────────────── */
    const chargeColumns = [
        { title: 'Date', dataIndex: 'charge_date', width: 180, render: formatDateTime },
        { title: 'Charge', dataIndex: 'charge_name', render: (v) => v || '-' },
        {
            title: 'Amount', dataIndex: 'amount', align: 'right', width: 130,
            render: (v) => <Text strong>{money(v)}</Text>,
        },
        {
            title: 'Paid From',
            render: (_, row) => acctLabel(row?.charges_paid_from_account || row?.chargesPaidFromAccount) || row?.charges_paid_from_account_id || '-',
        },
        { title: 'Reference', dataIndex: 'reference', render: (v) => v || '-' },
        { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-' },
        {
            title: 'Status', width: 110,
            render: (_, row) => <Tag color={row?.void ? 'error' : 'success'}>{row?.void ? 'Voided' : (row?.status || 'Active')}</Tag>,
        },
    ];

    const topupColumns = [
        { title: 'Date', dataIndex: 'topup_date', width: 180, render: formatDateTime },
        { title: 'Topup No', dataIndex: 'topup_no', render: (v) => v || '-' },
        {
            title: 'Amount', dataIndex: 'amount', align: 'right', width: 130,
            render: (v) => <Text strong>{money(v)}</Text>,
        },
        {
            title: 'Received In',
            render: (_, row) => acctLabel(row?.loan_received_in_account || row?.loanReceivedInAccount) || row?.loan_received_in_account_id || '-',
        },
        { title: 'Reference', dataIndex: 'reference', render: (v) => v || '-' },
        { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-' },
        {
            title: 'Status', width: 110,
            render: (_, row) => <Tag color={row?.void ? 'error' : 'success'}>{row?.void ? 'Voided' : (row?.status || 'Active')}</Tag>,
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ margin: 0 }}>
                        {record?.name || 'Loan Account'}
                    </Title>
                    {record?.loan_number && (
                        <Text type="secondary">Loan # {record.loan_number}</Text>
                    )}
                </Space>
            }
        >
            <Head title={record?.name || 'Loan Account'} />

            <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>

                    {/* Toolbar */}
                    <Space wrap>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.visit(route('accounting.loan-accounts.index'))}
                        >
                            Back
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => { loadRecord(); loadPaybacks(); }}
                        >
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openPaybackModal}
                            disabled={!record || outstanding <= 0}
                        >
                            Record Principal Repayment
                        </Button>
                    </Space>

                    {/* Summary statistics */}
                    <Row gutter={[token.marginSM, token.marginSM]}>
                        {[
                            { label: 'Opening Balance',    value: record?.opening_balance,         color: token.colorPrimary },
                            { label: 'Outstanding Balance', value: outstanding,                    color: token.colorWarning },
                            { label: 'Total Repaid',       value: totalRepaid,                     color: token.colorSuccess },
                            { label: 'Interest Rate p.a.', value: record?.interest_rate_per_annum, color: token.colorInfo, suffix: '%' },
                        ].map((c) => (
                            <Col xs={24} sm={12} md={6} key={c.label}>
                                <Card size="small" loading={loading} style={{ borderTop: `2px solid ${c.color}` }}>
                                    <Statistic
                                        title={c.label}
                                        value={Number(c.value || 0)}
                                        precision={2}
                                        suffix={c.suffix}
                                        valueStyle={{ fontSize: 17, color: c.color }}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* Tabs */}
                    <Card bordered={false} bodyStyle={{ padding: 0 }}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            tabBarStyle={{ paddingLeft: token.padding, paddingRight: token.padding, marginBottom: 0 }}
                            items={[
                                {
                                    key: 'overview',
                                    label: 'Overview',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                                                <Descriptions.Item label="Name">{record?.name || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Status">
                                                    {record?.status ? (
                                                        <Tag color={statusColor[record.status] || 'default'}>
                                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                                        </Tag>
                                                    ) : '-'}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Bank Name">{record?.bank_name || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Loan Number">{record?.loan_number || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Opening Balance">{money(record?.opening_balance)}</Descriptions.Item>
                                                <Descriptions.Item label="Outstanding Balance"><Text strong style={{ color: token.colorWarning }}>{money(outstanding)}</Text></Descriptions.Item>
                                                <Descriptions.Item label="Total Repaid"><Text style={{ color: token.colorSuccess }}>{money(totalRepaid)}</Text></Descriptions.Item>
                                                <Descriptions.Item label="Interest Rate p.a.">{record?.interest_rate_per_annum ? `${record.interest_rate_per_annum}%` : '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Duration">{record?.duration_in_month ? `${record.duration_in_month} months` : '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Processing Fee">{money(record?.processing_fee)}</Descriptions.Item>
                                                <Descriptions.Item label="Description" span={2}>{record?.description || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Remarks" span={2}>{record?.remarks || '-'}</Descriptions.Item>
                                            </Descriptions>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'paybacks',
                                    label: `Principal Repayments (${activePaybacks.length})`,
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Space wrap style={{ marginBottom: token.marginSM }}>
                                                <Button
                                                    type="primary"
                                                    icon={<PlusOutlined />}
                                                    onClick={openPaybackModal}
                                                    disabled={!record || outstanding <= 0}
                                                >
                                                    Record Repayment
                                                </Button>
                                                <Button icon={<ReloadOutlined />} onClick={loadPaybacks}>
                                                    Refresh
                                                </Button>
                                                {totalRepaid > 0 && (
                                                    <Text type="secondary">
                                                        Total repaid: <Text strong>{money(totalRepaid)}</Text>
                                                    </Text>
                                                )}
                                            </Space>
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                columns={paybackColumns}
                                                dataSource={paybacks}
                                                loading={paybacksLoading}
                                                pagination={{ pageSize: 15, showTotal: (t) => `${t} records` }}
                                                scroll={{ x: 900 }}
                                            />
                                        </div>
                                    ),
                                },
                                {
                                    key: 'charges',
                                    label: `Charges (${activeCharges.length})`,
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            {totalCharges > 0 && (
                                                <Text type="secondary" style={{ display: 'block', marginBottom: token.marginSM }}>
                                                    Total charges: <Text strong>{money(totalCharges)}</Text>
                                                </Text>
                                            )}
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                columns={chargeColumns}
                                                dataSource={charges}
                                                loading={loading}
                                                pagination={{ pageSize: 15, showTotal: (t) => `${t} records` }}
                                                scroll={{ x: 950 }}
                                            />
                                        </div>
                                    ),
                                },
                                {
                                    key: 'topups',
                                    label: `Topups (${activeTopups.length})`,
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            {totalTopups > 0 && (
                                                <Text type="secondary" style={{ display: 'block', marginBottom: token.marginSM }}>
                                                    Total topups: <Text strong>{money(totalTopups)}</Text>
                                                </Text>
                                            )}
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                columns={topupColumns}
                                                dataSource={topups}
                                                loading={loading}
                                                pagination={{ pageSize: 15, showTotal: (t) => `${t} records` }}
                                                scroll={{ x: 950 }}
                                            />
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Space>
            </div>

            {/* Record Repayment Modal */}
            <Modal
                title="Record Principal Repayment"
                open={paybackOpen}
                onCancel={() => { setPaybackOpen(false); paybackForm.resetFields(); }}
                onOk={submitPayback}
                confirmLoading={paybackSaving}
                okText="Save Repayment"
                width={560}
                destroyOnClose
            >
                {record && outstanding > 0 && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: '8px 12px',
                            background: token.colorBgLayout,
                            borderRadius: token.borderRadius,
                        }}
                    >
                        <Text type="secondary">Outstanding Principal: </Text>
                        <Text strong style={{ color: token.colorWarning }}>
                            {money(outstanding)}
                        </Text>
                    </div>
                )}

                <Form form={paybackForm} layout="vertical">
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="payback_date"
                                label="Repayment Date"
                                rules={[{ required: true, message: 'Repayment date is required' }]}
                            >
                                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="amount"
                                label="Repayment Amount"
                                rules={[
                                    { required: true, message: 'Amount is required' },
                                    { type: 'number', min: 0.01, message: 'Amount must be greater than zero' },
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0.01}
                                    step={0.01}
                                    precision={2}
                                    placeholder="0.00"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item
                                name="paid_from_account_id"
                                label="Paid From Account (Bank / Cash)"
                                rules={[{ required: true, message: 'Please select the account used for this repayment' }]}
                                extra="Select the bank or cash account the repayment is paid from."
                            >
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Search and select bank or cash account"
                                    loading={accountLoading}
                                    options={accountOptions}
                                    optionFilterProp="label"
                                    onSearch={loadAccounts}
                                    filterOption={false}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="reference" label="Reference">
                                <Input placeholder="e.g. CHQ-001 or Bank Ref" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="notes" label="Notes">
                                <Input.TextArea rows={2} placeholder="Optional notes" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
