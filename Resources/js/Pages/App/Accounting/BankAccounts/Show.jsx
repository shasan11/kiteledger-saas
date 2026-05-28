import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    Alert,
    App,
    Button,
    Card,
    Col,
    DatePicker,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Segmented,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    Upload,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckOutlined,
    DownloadOutlined,
    ImportOutlined,
    LinkOutlined,
    LockOutlined,
    PrinterOutlined,
    ReloadOutlined,
    SearchOutlined,
    StopOutlined,
    UploadOutlined,
} from '@ant-design/icons';
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
    { date: '2026-05-21', description: 'Opening Deposit', reference: 'REF-001', debit: 1000, credit: 0, balance: 1000, counterparty: 'Customer', remarks: 'Opening bank deposit' },
    { date: '2026-05-21', description: 'Bank Charge', reference: 'REF-002', debit: 0, credit: 15, balance: 985, counterparty: 'Bank', remarks: 'Monthly service charge' },
    { date: '2026-05-22', description: 'Invoice Payment Received', reference: 'INV-1001', debit: 2500, credit: 0, balance: 3485, counterparty: 'Himalayan Traders', remarks: 'Payment received against invoice' },
];

const money = (value) =>
    Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const moneyForCurrency = (value, currency) => {
    const decimals = Number(currency?.decimal_places ?? 2);
    const prefix = currency?.symbol || currency?.code || '';
    return `${prefix ? `${prefix} ` : ''}${Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;
};
const cleanParams = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadBlob = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const cleanString = (v) => (v === null || v === undefined ? '' : String(v).trim());

const parseAmount = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/,/g, '').replace(/Rs\.?/gi, '').replace(/NPR/gi, '').replace(/रु/g, '').replace(/[^\d.-]/g, '').trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
};

const normalizeDate = (value) => {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (!parsed) return '';
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return text;
};

const getValue = (row, key) => {
    const lk = key.toLowerCase();
    const k = Object.keys(row).find(
        (item) =>
            String(item).trim().toLowerCase() === lk ||
            String(item).trim().toLowerCase().replace(/\s+/g, '_') === lk,
    );
    return k ? row[k] : '';
};

const getErrorMessage = (error, fallback) => {
    const errs = error?.response?.data?.errors;
    if (errs && typeof errs === 'object') {
        const first = Object.values(errs).flat()[0];
        if (first) return first;
    }
    return error?.response?.data?.message || fallback;
};

const accountLabel = (row) =>
    [row?.code, row?.name || row?.label].filter(Boolean).join(' - ') || row?.id || 'Account';

const matchingColor = (status) => {
    switch (status) {
        case 'matched': return 'green';
        case 'pending': return 'gold';
        case 'ignored': return 'default';
        case 'unmatched': return 'orange';
        default: return 'blue';
    }
};

const confidenceColor = (c) => {
    switch (c) {
        case 'exact': return 'green';
        case 'high': return 'cyan';
        case 'medium': return 'blue';
        case 'low': return 'orange';
        default: return 'default';
    }
};

export default function BankAccountShow({ id }) {
    const { message, modal } = App.useApp();
    const { token } = theme.useToken();

    const [postForm] = Form.useForm();
    const [manualMatchForm] = Form.useForm();
    const [forexForm] = Form.useForm();
    const [finalizeForm] = Form.useForm();

    const [record, setRecord] = useState(null);
    const [summary, setSummary] = useState({});
    const [statementLines, setStatementLines] = useState([]);
    const [ledgerLines, setLedgerLines] = useState([]);
    const [accountLedgerRows, setAccountLedgerRows] = useState([]);
    const [accountLedgerLoading, setAccountLedgerLoading] = useState(false);
    const [accountLedgerFilters, setAccountLedgerFilters] = useState({ search: '', date_from: '', date_to: '' });
    const [accountLedgerPagination, setAccountLedgerPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [history, setHistory] = useState([]);
    const [report, setReport] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [activeTab, setActiveTab] = useState('overview');

    const [loading, setLoading] = useState(true);
    const [autoMatching, setAutoMatching] = useState(false);
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const [importOpen, setImportOpen] = useState(false);
    const [preview, setPreview] = useState([]);
    const [importing, setImporting] = useState(false);

    const [accountOptions, setAccountOptions] = useState([]);
    const [accountLoading, setAccountLoading] = useState(false);
    const [postingOpen, setPostingOpen] = useState(false);
    const [postingLine, setPostingLine] = useState(null);
    const [posting, setPosting] = useState(false);

    const [manualMatchOpen, setManualMatchOpen] = useState(false);
    const [manualMatchLine, setManualMatchLine] = useState(null);
    const [manualMatching, setManualMatching] = useState(false);

    const [forexPreview, setForexPreview] = useState(null);
    const [forexPosting, setForexPosting] = useState(false);

    const params = useMemo(() => {
        const [from, to] = dateRange;
        return {
            date_from: from?.format ? from.format('YYYY-MM-DD') : undefined,
            date_to: to?.format ? to.format('YYYY-MM-DD') : undefined,
        };
    }, [dateRange]);

    const bankMoney = useCallback(
        (value) => moneyForCurrency(value, record?.currency),
        [record?.currency],
    );

    const loadAccounts = useCallback(
        async (search = '') => {
            setAccountLoading(true);
            try {
                const res = await axios.get(api('/api/accounts/'), {
                    headers: authHeaders(),
                    params: { search, active: true, page_size: 30, ordering: 'code' },
                });
                const rows = res.data?.results || res.data?.data || (Array.isArray(res.data) ? res.data : []);
                setAccountOptions(
                    rows
                        .filter((row) => String(row.id) !== String(record?.account_id))
                        .map((row) => ({ value: row.id, label: accountLabel(row) })),
                );
            } catch (e) {
                message.error('Failed to load accounts.');
            } finally {
                setAccountLoading(false);
            }
        },
        [record?.account_id, message],
    );

    const loadAll = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [recRes, sumRes, histRes] = await Promise.all([
                axios.get(bankApi(id), { headers: authHeaders() }),
                axios.get(bankApi(id, '/reconciliation'), { headers: authHeaders(), params }),
                axios.get(bankApi(id, '/reconciliation/history'), { headers: authHeaders() }),
            ]);
            setRecord(recRes.data?.data || recRes.data);
            const s = sumRes.data || {};
            setSummary(s);
            setStatementLines(s.statement_lines || []);
            setLedgerLines(s.ledger_lines || []);
            setHistory(histRes.data?.data || []);
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to load bank account data.'));
        } finally {
            setLoading(false);
        }
    }, [id, params, message]);

    const loadAccountLedger = useCallback(async (overrides = {}) => {
        if (!id) return;
        setAccountLedgerLoading(true);
        try {
            const merged = cleanParams({
                ...accountLedgerFilters,
                page: accountLedgerPagination.current,
                page_size: accountLedgerPagination.pageSize,
                ...overrides,
            });
            const res = await axios.get(bankApi(id, '/ledger'), {
                headers: authHeaders(),
                params: merged,
            });
            setAccountLedgerRows(res.data?.results || res.data?.rows || []);
            setAccountLedgerPagination((prev) => ({
                ...prev,
                current: Number(res.data?.page || merged.page || 1),
                pageSize: Number(res.data?.page_size || merged.page_size || prev.pageSize),
                total: Number(res.data?.count || 0),
            }));
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to load account ledger.')); 
        } finally {
            setAccountLedgerLoading(false);
        }
    }, [id, accountLedgerFilters, accountLedgerPagination.current, accountLedgerPagination.pageSize, message]);

    useEffect(() => { void loadAll(); }, [loadAll]);
    useEffect(() => { void loadAccountLedger({ page: 1 }); }, [id]);
    useEffect(() => { if (record) void loadAccounts(); }, [record?.id, loadAccounts]);

    // -- Import flow (preserved + dedupe) ----------------------------
    const parseFile = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const normalized = rows.map((row, index) => {
                const debit = parseAmount(getValue(row, 'debit'));
                const credit = parseAmount(getValue(row, 'credit'));
                const bal = getValue(row, 'balance');
                const line = {
                    key: index,
                    date: normalizeDate(getValue(row, 'date')),
                    description: cleanString(getValue(row, 'description')),
                    reference: cleanString(getValue(row, 'reference')),
                    debit,
                    credit,
                    balance: bal === '' || bal === null ? null : parseAmount(bal),
                    counterparty: cleanString(getValue(row, 'counterparty')),
                    remarks: cleanString(getValue(row, 'remarks')),
                    warning: '',
                };
                if (!line.date) line.warning = 'Date is required.';
                else if (line.debit <= 0 && line.credit <= 0) line.warning = 'Debit or credit amount is required.';
                else if (line.debit > 0 && line.credit > 0) line.warning = 'Both debit and credit cannot have value.';
                return line;
            });
            setPreview(normalized);
            if (!normalized.length) message.warning('No rows found in uploaded statement.');
            else message.success(`${normalized.length} statement lines loaded.`);
        } catch (e) {
            message.error('Failed to read uploaded file.');
        }
        return false;
    };

    const confirmImport = async () => {
        const valid = preview.filter((row) => !row.warning);
        if (!valid.length) {
            message.warning('No valid statement lines to import.');
            return;
        }
        const payload = valid.map(({ key, warning, ...line }) => line);
        setImporting(true);
        try {
            const res = await axios.post(
                bankApi(id, '/statement-import'),
                { lines: payload },
                { headers: authHeaders() },
            );
            const skipped = res.data?.skipped_duplicates || 0;
            message.success(
                `${res.data?.created ?? 0} imported${skipped ? `, ${skipped} duplicates skipped` : ''}.`,
            );
            setImportOpen(false);
            setPreview([]);
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to import statement.'));
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet(demoStatementRows, { header: templateColumns });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Statement');
        XLSX.writeFile(wb, 'bank-statement-template.xlsx');
    };

    // -- Create JV -----------------------------------------------------
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
            const res = await axios.post(
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
            message.success(res.data?.message || 'Journal voucher created.');
            setPostingOpen(false);
            setPostingLine(null);
            postForm.resetFields();
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to create journal voucher.'));
        } finally {
            setPosting(false);
        }
    };

    // -- Reconciliation actions ----------------------------------------
    const callRec = async (path, body = {}, successMsg) => {
        try {
            const res = await axios.post(bankApi(id, `/reconciliation/${path}`), body, { headers: authHeaders() });
            if (successMsg) message.success(res.data?.message || successMsg);
            await loadAll();
            return res.data;
        } catch (error) {
            message.error(getErrorMessage(error, 'Action failed.'));
        }
    };

    const ignoreStatementLine = (row) => {
        modal.confirm({
            title: 'Ignore this statement line?',
            content: 'Ignored lines stay in history but will not be matched or posted.',
            okText: 'Ignore',
            onOk: () =>
                axios.post(
                    bankApi(id, '/statement-import'),
                    { action: 'ignore', statement_line_id: row.id },
                    { headers: authHeaders() },
                ).then(() => { message.success('Statement line ignored.'); return loadAll(); })
                  .catch((e) => message.error(getErrorMessage(e, 'Failed to ignore.'))),
        });
    };

    const restoreLine = (row) => callRec('restore', { statement_line_id: row.id }, 'Restored.');
    const markPending = (row) => callRec('mark-pending', { statement_line_id: row.id }, 'Marked as pending.');
    const unmatchLine = (row) => callRec('unmatch', { statement_line_id: row.id }, 'Unmatched.');

    const runAutoMatch = async () => {
        setAutoMatching(true);
        try {
            const res = await axios.post(
                bankApi(id, '/reconciliation/auto-match'),
                {},
                { headers: authHeaders() },
            );
            message.success(`Auto-matched ${res.data?.applied_count ?? 0} (${res.data?.suggested_count ?? 0} suggested).`);
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Auto match failed.'));
        } finally {
            setAutoMatching(false);
        }
    };

    const openManualMatch = (row) => {
        setManualMatchLine(row);
        manualMatchForm.resetFields();
        setManualMatchOpen(true);
    };

    const confirmManualMatch = async () => {
        const values = await manualMatchForm.validateFields();
        setManualMatching(true);
        try {
            await axios.post(
                bankApi(id, '/reconciliation/manual-match'),
                {
                    statement_line_id: manualMatchLine?.id,
                    journal_voucher_line_id: values.journal_voucher_line_id,
                    remarks: values.remarks || null,
                },
                { headers: authHeaders() },
            );
            message.success('Matched.');
            setManualMatchOpen(false);
            setManualMatchLine(null);
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to match.'));
        } finally {
            setManualMatching(false);
        }
    };

    const openFinalize = () => {
        finalizeForm.setFieldsValue({
            statement_date: undefined,
            period: undefined,
            remarks: '',
            force: false,
        });
        setFinalizeOpen(true);
    };

    const confirmFinalize = async () => {
        const v = await finalizeForm.validateFields();
        setFinalizing(true);
        try {
            await axios.post(
                bankApi(id, '/reconciliation/finalize'),
                {
                    statement_date: v.statement_date?.format ? v.statement_date.format('YYYY-MM-DD') : undefined,
                    period_from: v.period?.[0]?.format ? v.period[0].format('YYYY-MM-DD') : undefined,
                    period_to: v.period?.[1]?.format ? v.period[1].format('YYYY-MM-DD') : undefined,
                    remarks: v.remarks || null,
                    force: v.force || false,
                },
                { headers: authHeaders() },
            );
            message.success('Reconciliation finalized.');
            setFinalizeOpen(false);
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to finalize.'));
        } finally {
            setFinalizing(false);
        }
    };

    const reopenReconciliation = (rec) => {
        modal.confirm({
            title: `Reopen reconciliation dated ${rec.statement_date}?`,
            content: 'Reopening unlocks the reconciliation for further edits.',
            onOk: async () => {
                try {
                    await axios.post(
                        bankApi(id, `/reconciliation/${rec.id}/reopen`),
                        {},
                        { headers: authHeaders() },
                    );
                    message.success('Reconciliation reopened.');
                    await loadAll();
                } catch (error) {
                    message.error(getErrorMessage(error, 'Failed to reopen.'));
                }
            },
        });
    };

    const loadReport = async () => {
        try {
            const res = await axios.get(bankApi(id, '/reconciliation/report'), {
                headers: authHeaders(),
                params,
            });
            setReport(res.data);
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to load report.'));
        }
    };

    // -- Forex ---------------------------------------------------------
    const runForexPreview = async () => {
        const v = await forexForm.validateFields(['foreign_balance', 'current_base_value', 'new_rate']);
        try {
            const res = await axios.post(
                bankApi(id, '/forex-adjustment/preview'),
                {
                    foreign_balance: v.foreign_balance,
                    current_base_value: v.current_base_value,
                    new_rate: v.new_rate,
                },
                { headers: authHeaders() },
            );
            setForexPreview(res.data);
        } catch (error) {
            message.error(getErrorMessage(error, 'Preview failed.'));
        }
    };

    const submitForex = async () => {
        const v = await forexForm.validateFields();
        setForexPosting(true);
        try {
            await axios.post(
                bankApi(id, '/forex-adjustment'),
                {
                    adjustment_date: v.adjustment_date?.format ? v.adjustment_date.format('YYYY-MM-DD') : undefined,
                    foreign_balance: v.foreign_balance,
                    current_base_value: v.current_base_value,
                    new_rate: v.new_rate,
                    gain_account_id: v.gain_account_id,
                    loss_account_id: v.loss_account_id,
                    reference: v.reference,
                    narration: v.narration,
                },
                { headers: authHeaders() },
            );
            message.success('Forex adjustment posted.');
            setForexPreview(null);
            forexForm.resetFields();
            await loadAll();
        } catch (error) {
            message.error(getErrorMessage(error, 'Failed to post forex adjustment.'));
        } finally {
            setForexPosting(false);
        }
    };

    const loadAccountLedgerExportRows = async () => {
        const res = await axios.get(bankApi(id, '/ledger'), {
            headers: authHeaders(),
            params: cleanParams({ ...accountLedgerFilters, page: 1, page_size: 500 }),
        });
        return res.data?.results || res.data?.rows || [];
    };

    const exportAccountLedgerCsv = async () => {
        const exportRows = await loadAccountLedgerExportRows();
        const csv = [
            ['Date', 'Description / Particulars', 'Debit', 'Credit', 'Balance'],
            ...exportRows.map((row) => [row.date, row.description, row.debit, row.credit, row.balance]),
        ].map((line) => line.map(csvEscape).join(',')).join('\n');
        downloadBlob(csv, 'text/csv;charset=utf-8;', `${record?.code || 'bank-account'}-ledger.csv`);
    };

    const exportAccountLedgerXlsx = async () => {
        const exportRows = await loadAccountLedgerExportRows();
        const worksheet = XLSX.utils.json_to_sheet(exportRows.map((row) => ({
            Date: row.date,
            'Description / Particulars': row.description,
            Debit: row.debit,
            Credit: row.credit,
            Balance: row.balance,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
        XLSX.writeFile(workbook, `${record?.code || 'bank-account'}-ledger.xlsx`);
    };

    // -- Columns -------------------------------------------------------
    const statementColumns = [
        { title: 'Date', dataIndex: 'date', width: 110 },
        { title: 'Description', dataIndex: 'description', render: (v) => v || '-' },
        { title: 'Reference', dataIndex: 'reference', width: 130, render: (v) => v || '-' },
        { title: 'Deposit', dataIndex: 'debit', align: 'right', width: 110, render: (v) => (Number(v) ? money(v) : '-') },
        { title: 'Withdrawal', dataIndex: 'credit', align: 'right', width: 120, render: (v) => (Number(v) ? money(v) : '-') },
        { title: 'Balance', dataIndex: 'balance', align: 'right', width: 130, render: money },
        {
            title: 'Status', dataIndex: 'matching_status', width: 130,
            render: (v, row) => (
                <Space size={4}>
                    <Tag color={matchingColor(v)}>{String(v || 'unmatched').replace(/_/g, ' ')}</Tag>
                    {row?.match_confidence ? (
                        <Tag color={confidenceColor(row.match_confidence)}>{row.match_confidence}</Tag>
                    ) : null}
                </Space>
            ),
        },
        {
            title: 'JV', dataIndex: 'posted_journal_voucher_id', width: 90,
            render: (v) =>
                v ? <Link href={route('accounting.journal-vouchers.show', v)}>Open</Link> : '-',
        },
        {
            title: 'Actions', fixed: 'right', width: 260,
            render: (_, row) => {
                if (row?.matching_status === 'matched') {
                    return <Button size="small" onClick={() => unmatchLine(row)}>Unmatch</Button>;
                }
                if (row?.matching_status === 'ignored') {
                    return <Button size="small" onClick={() => restoreLine(row)}>Restore</Button>;
                }
                return (
                    <Space size={4} wrap>
                        <Tooltip title="Match manually with a ledger line">
                            <Button size="small" icon={<LinkOutlined />} onClick={() => openManualMatch(row)}>Match</Button>
                        </Tooltip>
                        <Button size="small" type="primary" onClick={() => openPostModal(row)}>Create JV</Button>
                        <Button size="small" onClick={() => markPending(row)}>Pending</Button>
                        <Button size="small" icon={<StopOutlined />} onClick={() => ignoreStatementLine(row)}>Ignore</Button>
                    </Space>
                );
            },
        },
    ];

    const ledgerColumns = [
        { title: 'Date', dataIndex: 'date', width: 110 },
        { title: 'Description / Particulars', dataIndex: 'description', render: (v) => v || '-' },
        { title: 'Debit', dataIndex: 'debit', align: 'right', width: 120, render: bankMoney },
        { title: 'Credit', dataIndex: 'credit', align: 'right', width: 120, render: bankMoney },
        { title: 'Balance', dataIndex: 'balance', align: 'right', width: 140, render: bankMoney },
    ];

    const previewColumns = [
        { title: 'Date', dataIndex: 'date', width: 110 },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Reference', dataIndex: 'reference', width: 130 },
        { title: 'Debit', dataIndex: 'debit', align: 'right', width: 110, render: money },
        { title: 'Credit', dataIndex: 'credit', align: 'right', width: 110, render: money },
        { title: 'Balance', dataIndex: 'balance', align: 'right', width: 120, render: (v) => v === null ? '-' : money(v) },
        { title: 'Counterparty', dataIndex: 'counterparty', width: 160 },
        { title: 'Remarks', dataIndex: 'remarks' },
        {
            title: 'Status', dataIndex: 'warning', width: 200,
            render: (v) => v ? <Tag color="red">{v}</Tag> : <Tag color="green">Valid</Tag>,
        },
    ];

    const historyColumns = [
        { title: 'Statement Date', dataIndex: 'statement_date', width: 130 },
        { title: 'Period', render: (_, r) => r.period_from && r.period_to ? `${r.period_from} → ${r.period_to}` : '-' },
        { title: 'Bank Closing', dataIndex: 'closing_bank_balance', align: 'right', render: money },
        { title: 'Software', dataIndex: 'software_balance', align: 'right', render: money },
        { title: 'Difference', dataIndex: 'reconciliation_difference', align: 'right', render: money },
        {
            title: 'Status', dataIndex: 'status', width: 110,
            render: (v) => <Tag color={v === 'finalized' ? 'green' : v === 'reopened' ? 'orange' : 'blue'}>{v}</Tag>,
        },
        { title: 'Finalized At', dataIndex: 'finalized_at', width: 170, render: (v) => v || '-' },
        {
            title: 'Actions', width: 110,
            render: (_, row) => row.status === 'finalized'
                ? <Button size="small" onClick={() => reopenReconciliation(row)}>Reopen</Button>
                : <Tag color="default">Editable</Tag>,
        },
    ];

    // -- Ledger candidates for manual matching dialog ------------------
    const unmatchedLedger = useMemo(
        () => ledgerLines.filter((l) => l.matching_status !== 'matched'),
        [ledgerLines],
    );

    const validPreviewCount = preview.filter((row) => !row.warning).length;
    const invalidPreviewCount = preview.length - validPreviewCount;
    const postingAmount = Math.max(Number(postingLine?.debit || 0), Number(postingLine?.credit || 0));
    const postingType = Number(postingLine?.debit || 0) > 0 ? 'Deposit' : 'Withdrawal';

    const statCards = [
        { label: 'Balance in Bank', value: summary.bank_balance, color: token.colorPrimary },
        { label: 'Balance in Software', value: summary.software_balance, color: token.colorInfo },
        { label: 'Reconciliation Difference', value: summary.reconciliation_difference, color: Math.abs(summary.reconciliation_difference || 0) < 0.01 ? token.colorSuccess : token.colorWarning },
        { label: 'Matched Amount', value: summary.matched_amount, color: token.colorSuccess },
        { label: 'Unmatched Bank', value: summary.unmatched_bank_amount, color: token.colorWarning },
        { label: 'Unmatched Software', value: summary.unmatched_software_amount, color: token.colorWarning },
    ];

    // ---------------------------------------------------------------- render
    return (
        <AuthenticatedLayout
            header={
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ margin: 0 }}>{record?.display_name || 'Bank Account'}</Title>
                    <Text type="secondary">{record?.bank_name || record?.code || 'Bank ledger'}</Text>
                </Space>
            }
        >
            <Head title={record?.display_name || 'Bank Account'} />

            <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                    <Space wrap>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => router.visit(route('accounting.bank-accounts.index'))}>Back</Button>
                        <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import Statement</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => loadAll()}>Refresh</Button>
                        <RangePicker
                            value={dateRange}
                            onChange={(v) => setDateRange(v || [null, null])}
                        />
                        <Tag color={summary.reconciliation_status === 'reconciled' ? 'green' : 'orange'} style={{ padding: '4px 10px' }}>
                            {summary.reconciliation_status === 'reconciled' ? 'Reconciled' : 'Needs Review'}
                        </Tag>
                        {summary.last_reconciled_date ? (
                            <Text type="secondary">Last reconciled: {summary.last_reconciled_date}</Text>
                        ) : null}
                    </Space>

                    <Row gutter={[token.marginSM, token.marginSM]}>
                        {statCards.map((c) => (
                            <Col xs={24} sm={12} md={8} lg={4} key={c.label}>
                                <Card size="small" loading={loading} style={{ borderTop: `2px solid ${c.color}` }}>
                                    <Statistic
                                        title={c.label}
                                        value={Number(c.value || 0)}
                                        precision={2}
                                        valueStyle={{ fontSize: 18, color: c.color }}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>

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
                                            <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} bordered>
                                                <Descriptions.Item label="Bank Account">{record?.display_name}</Descriptions.Item>
                                                <Descriptions.Item label="Account No">{record?.account_number || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Currency">{record?.currency?.code || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Branch">{record?.branch?.name || '-'}</Descriptions.Item>
                                                <Descriptions.Item label="Linked Accounting Account">
                                                    {record?.account ? (
                                                        <Link href={route('accounting.accounts.index')}>
                                                            {accountLabel(record.account)}
                                                        </Link>
                                                    ) : '-'}
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Last Reconciled">{summary.last_reconciled_date || 'Never'}</Descriptions.Item>
                                            </Descriptions>

                                            {Math.abs(summary.reconciliation_difference || 0) >= 0.01 ? (
                                                <Alert
                                                    style={{ marginTop: token.margin }}
                                                    showIcon type="warning"
                                                    message={`Bank and software ledger differ by ${money(summary.reconciliation_difference)}.`}
                                                    description="Move to the Reconciliation Workspace to match outstanding transactions."
                                                />
                                            ) : (
                                                <Alert
                                                    style={{ marginTop: token.margin }}
                                                    showIcon type="success"
                                                    message="Bank and software ledger balances agree."
                                                />
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    key: 'statement',
                                    label: 'Bank Statement Lines',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                columns={statementColumns}
                                                dataSource={statementLines}
                                                loading={loading}
                                                scroll={{ x: 1500 }}
                                                pagination={{ pageSize: 20 }}
                                                locale={{ emptyText: <Empty description="No statement lines yet. Import a statement to start." /> }}
                                            />
                                        </div>
                                    ),
                                },
                                {
                                    key: 'ledger',
                                    label: 'Account Ledger',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Space wrap style={{ marginBottom: token.marginSM }}>
                                                <Input
                                                    allowClear
                                                    prefix={<SearchOutlined />}
                                                    placeholder="Search particulars..."
                                                    value={accountLedgerFilters.search}
                                                    onChange={(event) => setAccountLedgerFilters((current) => ({ ...current, search: event.target.value }))}
                                                    onPressEnter={() => loadAccountLedger({ page: 1 })}
                                                    style={{ width: 260 }}
                                                />
                                                <RangePicker
                                                    onChange={(dates) => {
                                                        const next = {
                                                            date_from: dates?.[0]?.format('YYYY-MM-DD') || '',
                                                            date_to: dates?.[1]?.format('YYYY-MM-DD') || '',
                                                        };
                                                        setAccountLedgerFilters((current) => ({ ...current, ...next }));
                                                        loadAccountLedger({ ...next, page: 1 });
                                                    }}
                                                />
                                                <Button type="primary" icon={<SearchOutlined />} onClick={() => loadAccountLedger({ page: 1 })}>Apply</Button>
                                                <Button icon={<ReloadOutlined />} onClick={() => loadAccountLedger()}>Refresh</Button>
                                                <Button icon={<DownloadOutlined />} onClick={exportAccountLedgerCsv}>Export CSV</Button>
                                                <Button icon={<DownloadOutlined />} onClick={exportAccountLedgerXlsx}>Export XLSX</Button>
                                            </Space>
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                columns={ledgerColumns}
                                                dataSource={accountLedgerRows}
                                                loading={accountLedgerLoading}
                                                scroll={{ x: 760 }}
                                                pagination={{
                                                    current: accountLedgerPagination.current,
                                                    pageSize: accountLedgerPagination.pageSize,
                                                    total: accountLedgerPagination.total,
                                                    showSizeChanger: true,
                                                }}
                                                onChange={(next) => loadAccountLedger({ page: next.current, page_size: next.pageSize })}
                                                locale={{ emptyText: <Empty description="No account ledger entries." /> }}
                                            />
                                        </div>
                                    ),
                                },
                                {
                                    key: 'workspace',
                                    label: 'Reconciliation Workspace',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Space wrap style={{ marginBottom: token.margin }}>
                                                <Button type="primary" icon={<CheckOutlined />} loading={autoMatching} onClick={runAutoMatch}>Auto Match</Button>
                                                <Button icon={<LockOutlined />} onClick={openFinalize}>Finalize Reconciliation</Button>
                                                <Text type="secondary">Match bank statement lines on the left with software ledger lines on the right.</Text>
                                            </Space>

                                            <Row gutter={token.marginSM}>
                                                <Col xs={24} lg={12}>
                                                    <Card size="small" title={`Bank Statement (${statementLines.length})`} bodyStyle={{ padding: 0 }}>
                                                        <Table
                                                            size="small"
                                                            rowKey="id"
                                                            columns={[
                                                                { title: 'Date', dataIndex: 'date', width: 100 },
                                                                { title: 'Description', dataIndex: 'description', render: (v) => v || '-' },
                                                                { title: 'Amount', align: 'right', width: 110, render: (_, r) => `${r.direction === 'deposit' ? '+' : '-'}${money(r.amount)}` },
                                                                {
                                                                    title: 'Status', dataIndex: 'matching_status', width: 110,
                                                                    render: (v, r) => (
                                                                        <Space size={2} direction="vertical">
                                                                            <Tag color={matchingColor(v)}>{v}</Tag>
                                                                            {r.match_confidence ? <Tag color={confidenceColor(r.match_confidence)}>{r.match_confidence}</Tag> : null}
                                                                        </Space>
                                                                    ),
                                                                },
                                                                {
                                                                    title: '', width: 80,
                                                                    render: (_, row) => row.matching_status === 'matched'
                                                                        ? <Button size="small" onClick={() => unmatchLine(row)}>Unmatch</Button>
                                                                        : <Button size="small" type="link" onClick={() => openManualMatch(row)}>Match</Button>,
                                                                },
                                                            ]}
                                                            dataSource={statementLines}
                                                            pagination={{ pageSize: 15 }}
                                                            scroll={{ x: 600 }}
                                                        />
                                                    </Card>
                                                </Col>
                                                <Col xs={24} lg={12}>
                                                    <Card size="small" title={`Software Ledger (${ledgerLines.length})`} bodyStyle={{ padding: 0 }}>
                                                        <Table
                                                            size="small"
                                                            rowKey="id"
                                                            columns={[
                                                                { title: 'Date', dataIndex: 'date', width: 100 },
                                                                { title: 'Voucher', dataIndex: 'voucher_no', width: 110 },
                                                                { title: 'Description', dataIndex: 'description', render: (v) => v || '-' },
                                                                { title: 'Amount', align: 'right', width: 110, render: (_, r) => `${r.direction === 'deposit' ? '+' : '-'}${money(r.amount)}` },
                                                                {
                                                                    title: 'Status', dataIndex: 'matching_status', width: 100,
                                                                    render: (v) => <Tag color={matchingColor(v)}>{v}</Tag>,
                                                                },
                                                            ]}
                                                            dataSource={ledgerLines}
                                                            pagination={{ pageSize: 15 }}
                                                            scroll={{ x: 620 }}
                                                        />
                                                    </Card>
                                                </Col>
                                            </Row>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'forex',
                                    label: 'Forex Adjustment',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Alert
                                                type="info" showIcon
                                                style={{ marginBottom: token.margin }}
                                                message={`Revalue ${record?.currency?.code || ''} balance at a new exchange rate. The difference will be posted as a forex gain or loss journal voucher.`}
                                            />

                                            <Row gutter={token.margin}>
                                                <Col xs={24} md={14}>
                                                    <Card size="small" title="Adjustment">
                                                        <Form form={forexForm} layout="vertical" onValuesChange={() => setForexPreview(null)}>
                                                            <Row gutter={12}>
                                                                <Col span={12}>
                                                                    <Form.Item name="adjustment_date" label="Adjustment Date" rules={[{ required: true }]}>
                                                                        <DatePicker style={{ width: '100%' }} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="reference" label="Reference"><Input /></Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="foreign_balance" label="Foreign Currency Balance" rules={[{ required: true }]}>
                                                                        <InputNumber style={{ width: '100%' }} step="0.01" />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="current_base_value" label="Current Base Value" rules={[{ required: true }]}>
                                                                        <InputNumber style={{ width: '100%' }} step="0.01" />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="new_rate" label="New Exchange Rate" rules={[{ required: true }]}>
                                                                        <InputNumber style={{ width: '100%' }} step="0.000001" min={0.000001} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="gain_account_id" label="Forex Gain Account">
                                                                        <Select showSearch optionFilterProp="label" loading={accountLoading} options={accountOptions} onSearch={(v) => loadAccounts(v)} filterOption={false} allowClear />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item name="loss_account_id" label="Forex Loss Account">
                                                                        <Select showSearch optionFilterProp="label" loading={accountLoading} options={accountOptions} onSearch={(v) => loadAccounts(v)} filterOption={false} allowClear />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={24}>
                                                                    <Form.Item name="narration" label="Narration"><Input.TextArea rows={2} /></Form.Item>
                                                                </Col>
                                                            </Row>

                                                            <Space>
                                                                <Button onClick={runForexPreview}>Calculate Preview</Button>
                                                                <Button type="primary" loading={forexPosting} disabled={!forexPreview || forexPreview.type === 'none'} onClick={submitForex}>Create Forex Adjustment JV</Button>
                                                            </Space>
                                                        </Form>
                                                    </Card>
                                                </Col>
                                                <Col xs={24} md={10}>
                                                    <Card size="small" title="Revaluation Preview">
                                                        {forexPreview ? (
                                                            <Descriptions size="small" column={1} bordered>
                                                                <Descriptions.Item label="Foreign Balance">{money(forexPreview.foreign_balance)}</Descriptions.Item>
                                                                <Descriptions.Item label="Current Base Value">{money(forexPreview.current_base_value)}</Descriptions.Item>
                                                                <Descriptions.Item label="Existing Rate">{forexPreview.existing_rate}</Descriptions.Item>
                                                                <Descriptions.Item label="New Rate">{forexPreview.new_rate}</Descriptions.Item>
                                                                <Descriptions.Item label="Revalued Base">{money(forexPreview.revalued_base_value)}</Descriptions.Item>
                                                                <Descriptions.Item label="Gain / Loss">
                                                                    <Tag color={forexPreview.type === 'gain' ? 'green' : forexPreview.type === 'loss' ? 'red' : 'default'}>
                                                                        {forexPreview.type.toUpperCase()} {money(Math.abs(forexPreview.gain_loss))}
                                                                    </Tag>
                                                                </Descriptions.Item>
                                                            </Descriptions>
                                                        ) : (
                                                            <Empty description="Enter values and click Calculate Preview" />
                                                        )}
                                                    </Card>
                                                </Col>
                                            </Row>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'history',
                                    label: 'Reports & History',
                                    children: (
                                        <div style={{ padding: token.padding }}>
                                            <Space style={{ marginBottom: token.margin }}>
                                                <Button icon={<PrinterOutlined />} onClick={loadReport}>Load Reconciliation Report</Button>
                                                {report ? <Button onClick={() => window.print()}>Print</Button> : null}
                                            </Space>

                                            {report ? (
                                                <Card size="small" title="Bank Reconciliation Statement" style={{ marginBottom: token.margin }}>
                                                    <Descriptions size="small" column={2} bordered>
                                                        <Descriptions.Item label="Bank Account">{record?.display_name}</Descriptions.Item>
                                                        <Descriptions.Item label="Currency">{record?.currency?.code}</Descriptions.Item>
                                                        <Descriptions.Item label="Period">{report.period_from || '-'} → {report.period_to || '-'}</Descriptions.Item>
                                                        <Descriptions.Item label="Bank Closing Balance">{money(report.bank_balance)}</Descriptions.Item>
                                                        <Descriptions.Item label="Add: Outstanding Deposits">{money(report.outstanding_deposits)}</Descriptions.Item>
                                                        <Descriptions.Item label="Less: Outstanding Payments">{money(report.outstanding_payments)}</Descriptions.Item>
                                                        <Descriptions.Item label="Less: Bank Charges Not Recorded">{money(report.bank_charges_not_recorded)}</Descriptions.Item>
                                                        <Descriptions.Item label="Add: Bank Interest Not Recorded">{money(report.bank_interest_not_recorded)}</Descriptions.Item>
                                                        <Descriptions.Item label="Adjusted Balance">{money(report.adjusted_balance)}</Descriptions.Item>
                                                        <Descriptions.Item label="Software Balance">{money(report.software_balance)}</Descriptions.Item>
                                                        <Descriptions.Item label="Final Difference">
                                                            <Tag color={Math.abs(report.final_difference || 0) < 0.01 ? 'green' : 'orange'}>{money(report.final_difference)}</Tag>
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </Card>
                                            ) : null}

                                            <Card size="small" title="Reconciliation History" bodyStyle={{ padding: 0 }}>
                                                <Table
                                                    size="small"
                                                    rowKey="id"
                                                    columns={historyColumns}
                                                    dataSource={history}
                                                    pagination={{ pageSize: 10 }}
                                                    locale={{ emptyText: <Empty description="No finalized reconciliations yet" /> }}
                                                />
                                            </Card>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Space>
            </div>

            {/* Import drawer */}
            <Drawer
                title="Import Bank Statement"
                open={importOpen}
                onClose={() => setImportOpen(false)}
                width="min(960px, 100vw)"
                footer={
                    <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                        <Button onClick={() => setImportOpen(false)}>Cancel</Button>
                        <Button type="primary" loading={importing} disabled={!validPreviewCount} onClick={confirmImport}>
                            Confirm Import
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" style={{ width: '100%' }} size={token.margin}>
                    <Alert type="info" showIcon message="Duplicate rows (same date, reference, amount, description) are detected and skipped on import." />
                    <Space wrap>
                        <Button onClick={downloadTemplate}>Download Demo Template</Button>
                        <Upload accept=".csv,.xlsx,.xls,.tsv,.txt" beforeUpload={parseFile} showUploadList={false}>
                            <Button icon={<UploadOutlined />}>Upload CSV or Excel</Button>
                        </Upload>
                        {preview.length ? (
                            <Space>
                                <Tag color="green">Valid: {validPreviewCount}</Tag>
                                <Tag color={invalidPreviewCount ? 'red' : 'blue'}>Invalid: {invalidPreviewCount}</Tag>
                            </Space>
                        ) : null}
                    </Space>
                    <Table size="small" rowKey="key" dataSource={preview} pagination={{ pageSize: 8 }} scroll={{ x: 1300 }} columns={previewColumns} />
                </Space>
            </Drawer>

            {/* Create JV modal */}
            <Modal
                title="Create Journal Voucher from Statement Line"
                open={postingOpen}
                onCancel={() => { setPostingOpen(false); setPostingLine(null); postForm.resetFields(); }}
                onOk={createJournalVoucher}
                confirmLoading={posting}
                okText="Create & Post JV"
                width={620}
                destroyOnClose
            >
                <Alert
                    showIcon type="warning" style={{ marginBottom: 12 }}
                    message={`${postingType}: ${money(postingAmount)}`}
                    description={postingType === 'Deposit'
                        ? 'This will debit the bank account and credit the selected counter account.'
                        : 'This will credit the bank account and debit the selected counter account.'}
                />
                <Form form={postForm} layout="vertical">
                    <Form.Item name="offset_account_id" label="Counter Account" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select account" loading={accountLoading} options={accountOptions} optionFilterProp="label" onSearch={(v) => loadAccounts(v)} filterOption={false} />
                    </Form.Item>
                    <Form.Item name="reference" label="Reference"><Input /></Form.Item>
                    <Form.Item name="narration" label="Narration"><Input.TextArea rows={3} /></Form.Item>
                </Form>
            </Modal>

            {/* Manual match modal */}
            <Modal
                title="Match Statement Line with Ledger"
                open={manualMatchOpen}
                onCancel={() => { setManualMatchOpen(false); setManualMatchLine(null); }}
                onOk={confirmManualMatch}
                confirmLoading={manualMatching}
                okText="Match"
                destroyOnClose
            >
                {manualMatchLine ? (
                    <>
                        <Descriptions size="small" column={1} bordered style={{ marginBottom: token.margin }}>
                            <Descriptions.Item label="Date">{manualMatchLine.date}</Descriptions.Item>
                            <Descriptions.Item label="Description">{manualMatchLine.description || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Amount">
                                {manualMatchLine.direction === 'deposit' ? '+' : '-'}{money(manualMatchLine.amount)}
                            </Descriptions.Item>
                        </Descriptions>
                        <Form form={manualMatchForm} layout="vertical">
                            <Form.Item name="journal_voucher_line_id" label="Match With Ledger Line" rules={[{ required: true }]}>
                                <Select
                                    showSearch
                                    placeholder="Pick a software ledger line"
                                    optionFilterProp="label"
                                    options={unmatchedLedger.map((l) => ({
                                        value: l.id,
                                        label: `${l.date} • ${l.voucher_no || ''} • ${l.direction === 'deposit' ? '+' : '-'}${money(l.amount)} • ${l.description || ''}`,
                                    }))}
                                />
                            </Form.Item>
                            <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
                        </Form>
                    </>
                ) : null}
            </Modal>

            {/* Finalize modal */}
            <Modal
                title="Finalize Reconciliation"
                open={finalizeOpen}
                onCancel={() => setFinalizeOpen(false)}
                onOk={confirmFinalize}
                confirmLoading={finalizing}
                okText="Finalize"
                destroyOnClose
            >
                <Alert
                    showIcon
                    type={Math.abs(summary.reconciliation_difference || 0) < 0.01 ? 'success' : 'warning'}
                    style={{ marginBottom: token.margin }}
                    message={`Current difference: ${money(summary.reconciliation_difference)}`}
                    description={Math.abs(summary.reconciliation_difference || 0) < 0.01
                        ? 'Balances agree — safe to finalize.'
                        : 'Balances do not agree. Toggle "Force finalize" with a remark to proceed anyway.'}
                />
                <Form form={finalizeForm} layout="vertical">
                    <Form.Item name="statement_date" label="Statement Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="period" label="Period">
                        <RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name="force" label="Force Finalize" initialValue={false} tooltip="Use Force to finalize even when the difference is non-zero.">
                        <Segmented options={[{ label: 'No', value: false }, { label: 'Force', value: true }]} />
                    </Form.Item>
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
