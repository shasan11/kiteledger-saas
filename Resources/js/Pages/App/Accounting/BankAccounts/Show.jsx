import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    Alert,
    App,
    Button,
    Card,
    DatePicker,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    Upload,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    ImportOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;
const bankApi = (id, path = '') => api(`/api/bank-accounts/${id}${path}`);

const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const templateColumns = [
    'date',
    'description',
    'reference',
    'debit',
    'credit',
    'balance',
    'counterparty',
    'remarks',
];

const demoStatementRows = [
    {
        date: '2026-05-21',
        description: 'Opening Deposit',
        reference: 'REF-001',
        debit: 1000,
        credit: 0,
        balance: 1000,
        counterparty: 'Customer',
        remarks: 'Opening bank deposit',
    },
    {
        date: '2026-05-21',
        description: 'Bank Charge',
        reference: 'REF-002',
        debit: 0,
        credit: 15,
        balance: 985,
        counterparty: 'Bank',
        remarks: 'Monthly service charge',
    },
    {
        date: '2026-05-22',
        description: 'Invoice Payment Received',
        reference: 'INV-1001',
        debit: 2500,
        credit: 0,
        balance: 3485,
        counterparty: 'Himalayan Traders',
        remarks: 'Payment received against invoice',
    },
];

const money = (value) => {
    const number = Number(value || 0);

    return number.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const cleanString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const parseAmount = (value) => {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
        .replace(/,/g, '')
        .replace(/Rs\.?/gi, '')
        .replace(/NPR/gi, '')
        .replace(/रु/g, '')
        .replace(/[^\d.-]/g, '')
        .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
};

const normalizeDate = (value) => {
    if (!value) return '';

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);

        if (!parsed) return '';

        const month = String(parsed.m).padStart(2, '0');
        const day = String(parsed.d).padStart(2, '0');

        return `${parsed.y}-${month}-${day}`;
    }

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const parsedDate = new Date(text);

    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
    }

    return text;
};

const getValue = (row, key) => {
    const lowerKey = key.toLowerCase();

    const matchedKey = Object.keys(row).find(
        (item) =>
            String(item).trim().toLowerCase() === lowerKey ||
            String(item).trim().toLowerCase().replace(/\s+/g, '_') === lowerKey,
    );

    return matchedKey ? row[matchedKey] : '';
};

const getErrorMessage = (error, fallback) => {
    const errors = error?.response?.data?.errors;

    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat()[0];
        if (first) return first;
    }

    return error?.response?.data?.message || fallback;
};

const accountLabel = (row) =>
    [row?.code, row?.name || row?.label].filter(Boolean).join(' - ') || row?.id || 'Account';

export default function BankAccountShow({ id }) {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [postForm] = Form.useForm();

    const [record, setRecord] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [statementLines, setStatementLines] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);

    const [importOpen, setImportOpen] = useState(false);
    const [preview, setPreview] = useState([]);
    const [importing, setImporting] = useState(false);

    const [accountOptions, setAccountOptions] = useState([]);
    const [accountLoading, setAccountLoading] = useState(false);
    const [postingOpen, setPostingOpen] = useState(false);
    const [postingLine, setPostingLine] = useState(null);
    const [posting, setPosting] = useState(false);

    const loadAccounts = async (search = '') => {
        setAccountLoading(true);

        try {
            const response = await axios.get(api('/api/accounts/'), {
                headers: authHeaders(),
                params: {
                    search,
                    active: true,
                    page_size: 30,
                    ordering: 'code',
                },
            });

            const rows = response.data?.results || response.data?.data || (Array.isArray(response.data) ? response.data : []);

            setAccountOptions(
                rows
                    .filter((row) => String(row.id) !== String(record?.account_id))
                    .map((row) => ({
                        value: row.id,
                        label: accountLabel(row),
                    })),
            );
        } catch (error) {
            message.error('Failed to load accounts.');
        } finally {
            setAccountLoading(false);
        }
    };

    const load = async (params = {}) => {
        if (!id) return;

        setLoading(true);

        try {
            const [recordResponse, ledgerResponse] = await Promise.all([
                axios.get(bankApi(id), { headers: authHeaders() }),
                axios.get(bankApi(id, '/ledger'), {
                    params,
                    headers: authHeaders(),
                }),
            ]);

            const ledgerPayload = ledgerResponse.data || {};

            setRecord(recordResponse.data?.data || recordResponse.data);
            setLedger(ledgerPayload.rows || []);
            setStatementLines(ledgerPayload.statement_lines || []);
            setSummary(ledgerPayload);
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to load bank account ledger.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [id]);

    useEffect(() => {
        if (record) {
            void loadAccounts();
        }
    }, [record?.id, record?.account_id]);

    const parseFile = async (file) => {
        try {
            const buffer = await file.arrayBuffer();

            const workbook = XLSX.read(buffer, {
                cellDates: true,
            });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const rows = XLSX.utils.sheet_to_json(sheet, {
                defval: '',
            });

            const normalized = rows.map((row, index) => {
                const debit = parseAmount(getValue(row, 'debit'));
                const credit = parseAmount(getValue(row, 'credit'));
                const balanceValue = getValue(row, 'balance');

                const line = {
                    key: index,
                    date: normalizeDate(getValue(row, 'date')),
                    description: cleanString(getValue(row, 'description')),
                    reference: cleanString(getValue(row, 'reference')),
                    debit,
                    credit,
                    balance:
                        balanceValue === '' || balanceValue === null
                            ? null
                            : parseAmount(balanceValue),
                    counterparty: cleanString(getValue(row, 'counterparty')),
                    remarks: cleanString(getValue(row, 'remarks')),
                    warning: '',
                };

                if (!line.date) {
                    line.warning = 'Date is required.';
                } else if (line.debit <= 0 && line.credit <= 0) {
                    line.warning = 'Debit or credit amount is required.';
                } else if (line.debit > 0 && line.credit > 0) {
                    line.warning = 'Both debit and credit cannot have value.';
                }

                return line;
            });

            setPreview(normalized);

            if (!normalized.length) {
                message.warning('No rows found in uploaded statement.');
            } else {
                message.success(`${normalized.length} statement lines loaded.`);
            }
        } catch (error) {
            message.error('Failed to read uploaded file.');
        }

        return false;
    };

    const confirmImport = async () => {
        const validRows = preview.filter((row) => !row.warning);

        if (!validRows.length) {
            message.warning('No valid statement lines to import.');
            return;
        }

        const payload = validRows.map(({ key, warning, ...line }) => line);

        setImporting(true);

        try {
            const response = await axios.post(
                bankApi(id, '/statement-import'),
                { lines: payload },
                { headers: authHeaders() },
            );

            message.success(response.data?.message || 'Statement imported for review.');

            setImportOpen(false);
            setPreview([]);

            await load();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to import statement.'));
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(demoStatementRows, {
            header: templateColumns,
        });

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
        XLSX.writeFile(workbook, 'bank-statement-template.xlsx');
    };

    const openPostModal = (row) => {
        setPostingLine(row);
        postForm.setFieldsValue({
            offset_account_id: undefined,
            reference: row?.reference || '',
            narration: `Bank statement posting: ${row?.description || row?.reference || 'transaction'}`,
        });
        setPostingOpen(true);
    };

    const createJournalVoucher = async () => {
        const values = await postForm.validateFields();

        setPosting(true);

        try {
            const response = await axios.post(
                bankApi(id, '/statement-import'),
                {
                    action: 'create_journal_voucher',
                    statement_line_id: postingLine?.id,
                    offset_account_id: values.offset_account_id,
                    reference: values.reference || postingLine?.reference || null,
                    narration: values.narration || null,
                },
                { headers: authHeaders() },
            );

            message.success(response.data?.message || 'Journal voucher created and posted.');
            setPostingOpen(false);
            setPostingLine(null);
            postForm.resetFields();
            await load();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to create journal voucher.'));
        } finally {
            setPosting(false);
        }
    };

    const ignoreStatementLine = async (row) => {
        Modal.confirm({
            title: 'Ignore this bank statement line?',
            content: 'Ignored lines will stay in the statement history but will not be posted to accounts.',
            okText: 'Ignore',
            onOk: async () => {
                try {
                    const response = await axios.post(
                        bankApi(id, '/statement-import'),
                        {
                            action: 'ignore',
                            statement_line_id: row.id,
                        },
                        { headers: authHeaders() },
                    );

                    message.success(response.data?.message || 'Statement line ignored.');
                    await load();
                } catch (error) {
                    message.error(getErrorMessage(error, 'Failed to ignore statement line.'));
                }
            },
        });
    };

    const ledgerColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            width: 120,
        },
        {
            title: 'Voucher No',
            dataIndex: 'voucher_no',
            width: 150,
            render: (value, row) =>
                row.journal_voucher_id ? (
                    <Link href={route('accounting.journal-vouchers.show', row.journal_voucher_id)}>
                        {value || '-'}
                    </Link>
                ) : (
                    value || '-'
                ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            width: 260,
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            align: 'right',
            render: money,
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            align: 'right',
            render: money,
        },
        {
            title: 'Software Balance',
            dataIndex: 'balance',
            align: 'right',
            render: money,
        },
    ];

    const statementColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            width: 120,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            width: 240,
            render: (value) => value || '-',
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            width: 140,
            render: (value) => value || '-',
        },
        {
            title: 'Deposit',
            dataIndex: 'debit',
            align: 'right',
            width: 120,
            render: (value) => (Number(value) ? money(value) : '-'),
        },
        {
            title: 'Withdrawal',
            dataIndex: 'credit',
            align: 'right',
            width: 130,
            render: (value) => (Number(value) ? money(value) : '-'),
        },
        {
            title: 'Bank Balance',
            dataIndex: 'balance',
            align: 'right',
            width: 140,
            render: money,
        },
        {
            title: 'Counterparty',
            dataIndex: 'counterparty',
            width: 160,
            render: (value) => value || '-',
        },
        {
            title: 'Status',
            dataIndex: 'matching_status',
            width: 130,
            render: (value, row) => (
                <Tag color={value === 'matched' ? 'green' : value === 'ignored' ? 'default' : 'orange'}>
                    {String(value || row?.status || 'unmatched').replace(/_/g, ' ')}
                </Tag>
            ),
        },
        {
            title: 'JV',
            dataIndex: 'journal_voucher_id',
            width: 120,
            render: (value) =>
                value ? (
                    <Link href={route('accounting.journal-vouchers.show', value)}>Open JV</Link>
                ) : (
                    '-'
                ),
        },
        {
            title: 'Actions',
            fixed: 'right',
            width: 210,
            render: (_, row) => {
                const locked = row?.matching_status === 'matched' || row?.matching_status === 'ignored';

                if (locked) return '-';

                return (
                    <Space size={4}>
                        <Button size="small" type="primary" onClick={() => openPostModal(row)}>
                            Create JV
                        </Button>
                        <Button size="small" onClick={() => ignoreStatementLine(row)}>
                            Ignore
                        </Button>
                    </Space>
                );
            },
        },
    ];

    const previewColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            width: 120,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            width: 220,
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            width: 140,
        },
        {
            title: 'Debit',
            dataIndex: 'debit',
            align: 'right',
            width: 120,
            render: money,
        },
        {
            title: 'Credit',
            dataIndex: 'credit',
            align: 'right',
            width: 120,
            render: money,
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            align: 'right',
            width: 120,
            render: (value) => (value === null ? '-' : money(value)),
        },
        {
            title: 'Counterparty',
            dataIndex: 'counterparty',
            width: 180,
        },
        {
            title: 'Remarks',
            dataIndex: 'remarks',
            width: 220,
        },
        {
            title: 'Status',
            dataIndex: 'warning',
            width: 220,
            render: (value) =>
                value ? <Tag color="red">{value}</Tag> : <Tag color="green">Valid</Tag>,
        },
    ];

    const keyCards = useMemo(
        () => [
            ['Balance in bank account', summary.statement_balance ?? record?.statement_balance],
            ['Balance in software', summary.software_balance ?? record?.software_ledger_balance],
            [
                'Reconciliation difference',
                summary.reconciliation_difference ??
                    Math.abs(Number(summary.statement_balance || 0) - Number(summary.software_balance || 0)),
            ],
            ['Imported statement lines', summary.statement_line_count ?? record?.statement_line_count ?? 0],
            ['Last statement date', summary.last_statement_date || record?.last_statement_date || '-'],
            ['Last software transaction', summary.last_transaction_date || '-'],
        ],
        [record, summary],
    );

    const chartRows = statementLines.length ? statementLines : ledger;
    const validPreviewCount = preview.filter((row) => !row.warning).length;
    const invalidPreviewCount = preview.length - validPreviewCount;
    const postingAmount = Math.max(Number(postingLine?.debit || 0), Number(postingLine?.credit || 0));
    const postingType = Number(postingLine?.debit || 0) > 0 ? 'Deposit' : 'Withdrawal';

    return (
        <AuthenticatedLayout
            header={
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ margin: 0 }}>
                        {record?.display_name || 'Bank Account'}
                    </Title>

                    <Text type="secondary">
                        {record?.bank_name || record?.code || 'Bank ledger'}
                    </Text>
                </Space>
            }
        >
            <Head title={record?.display_name || 'Bank Account'} />

            <div
                style={{
                    padding: token.padding,
                    background: token.colorBgLayout,
                    minHeight: 'calc(100vh - 120px)',
                }}
            >
                <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                    <Space wrap>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => router.visit(route('accounting.bank-accounts.index'))}
                        >
                            Back
                        </Button>

                        <Button
                            type="primary"
                            icon={<ImportOutlined />}
                            onClick={() => setImportOpen(true)}
                        >
                            Import Statement
                        </Button>

                        <RangePicker
                            onChange={(dates) =>
                                load({
                                    date_from: dates?.[0]?.format('YYYY-MM-DD'),
                                    date_to: dates?.[1]?.format('YYYY-MM-DD'),
                                })
                            }
                        />
                    </Space>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: token.marginSM,
                        }}
                    >
                        {keyCards.map(([label, value]) => (
                            <Card key={label} bordered={false} loading={loading}>
                                <Text type="secondary">{label}</Text>

                                <div style={{ fontWeight: 700, fontSize: 18 }}>
                                    {typeof value === 'number' ? money(value) : value || '-'}
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Card title="Bank Statement Balance Movement" loading={loading} bordered={false}>
                        {chartRows.length ? (
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartRows}>
                                        <CartesianGrid
                                            stroke={token.colorBorderSecondary}
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis dataKey="date" />

                                        <YAxis tickFormatter={money} width={90} />

                                        <Tooltip formatter={money} />

                                        <Line
                                            type="monotone"
                                            dataKey="balance"
                                            stroke={token.colorPrimary}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <Empty description="No bank statement movement found" />
                        )}
                    </Card>

                    <Card title="Imported Bank Statement Lines" bordered={false}>
                        <Table
                            size="small"
                            rowKey={(row, index) => row.id || row.reference || index}
                            columns={statementColumns}
                            dataSource={statementLines}
                            loading={loading}
                            scroll={{ x: 1600 }}
                            locale={{ emptyText: <Empty description="No imported statement lines" /> }}
                        />
                    </Card>

                    <Card title="Software Ledger" bordered={false}>
                        <Table
                            size="small"
                            rowKey={(row, index) => row.id || row.reference || index}
                            columns={ledgerColumns}
                            dataSource={ledger}
                            loading={loading}
                            scroll={{ x: 900 }}
                            locale={{ emptyText: <Empty description="No software ledger movement found" /> }}
                        />
                    </Card>
                </Space>
            </div>

            <Drawer
                title="Import Bank Statement"
                open={importOpen}
                onClose={() => setImportOpen(false)}
                width="min(960px, 100vw)"
                footer={
                    <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                        <Button onClick={() => setImportOpen(false)}>Cancel</Button>

                        <Button
                            type="primary"
                            loading={importing}
                            disabled={!validPreviewCount}
                            onClick={confirmImport}
                        >
                            Confirm Import
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size={token.margin}>
                    <Alert
                        type="info"
                        showIcon
                        message="Imported statement lines are saved for reconciliation. Use Create JV to post selected lines into actual accounts."
                    />

                    <Space wrap>
                        <Button onClick={downloadTemplate}>Download Demo Template</Button>

                        <Upload
                            accept=".csv,.xlsx,.xls,.tsv,.txt"
                            beforeUpload={parseFile}
                            showUploadList={false}
                        >
                            <Button icon={<UploadOutlined />}>Upload CSV or Excel</Button>
                        </Upload>

                        {preview.length ? (
                            <Space>
                                <Tag color="green">Valid: {validPreviewCount}</Tag>
                                <Tag color={invalidPreviewCount ? 'red' : 'blue'}>
                                    Invalid: {invalidPreviewCount}
                                </Tag>
                            </Space>
                        ) : null}
                    </Space>

                    <Table
                        size="small"
                        rowKey="key"
                        dataSource={preview}
                        pagination={{ pageSize: 8 }}
                        scroll={{ x: 1300 }}
                        columns={previewColumns}
                    />
                </Space>
            </Drawer>

            <Modal
                title="Create Journal Voucher from Statement Line"
                open={postingOpen}
                onCancel={() => {
                    setPostingOpen(false);
                    setPostingLine(null);
                    postForm.resetFields();
                }}
                onOk={createJournalVoucher}
                confirmLoading={posting}
                okText="Create & Post JV"
                width={620}
                destroyOnClose
            >
                <Alert
                    showIcon
                    type="warning"
                    style={{ marginBottom: 12 }}
                    message={`${postingType}: ${money(postingAmount)}`}
                    description={
                        postingType === 'Deposit'
                            ? 'This will debit the bank account and credit the selected counter account.'
                            : 'This will credit the bank account and debit the selected counter account.'
                    }
                />

                <Form form={postForm} layout="vertical">
                    <Form.Item
                        name="offset_account_id"
                        label="Counter Account"
                        rules={[{ required: true, message: 'Counter account is required' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Select account"
                            loading={accountLoading}
                            options={accountOptions}
                            optionFilterProp="label"
                            onSearch={(value) => loadAccounts(value)}
                            filterOption={false}
                        />
                    </Form.Item>

                    <Form.Item name="reference" label="Reference">
                        <Input placeholder="Reference" />
                    </Form.Item>

                    <Form.Item name="narration" label="Narration">
                        <Input.TextArea rows={3} placeholder="Narration" />
                    </Form.Item>
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
