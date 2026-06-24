import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import dayjs from 'dayjs';
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
    Dropdown,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
    message as antMessage,
    theme,
} from 'antd';
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    InboxOutlined,
    MoreOutlined,
    PlusOutlined,
    ReloadOutlined,
    ScanOutlined,
    SearchOutlined,
    SwapOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

const STATUS_COLORS = {
    uploaded: 'default',
    queued: 'processing',
    processing: 'processing',
    extracted: 'cyan',
    needs_review: 'gold',
    converted: 'green',
    failed: 'red',
    archived: 'default',
};

const STATUS_LABELS = {
    uploaded: 'Uploaded',
    queued: 'Queued',
    processing: 'Processing',
    extracted: 'Extracted',
    needs_review: 'Needs Review',
    converted: 'Converted',
    failed: 'Failed',
    archived: 'Archived',
};

const SUMMARY_FIELDS = [
    { key: 'document_type', label: 'Document Type' },
    { key: 'document_number', label: 'Document Number', aliases: ['invoice_number', 'bill_number', 'number', 'reference_number'] },
    { key: 'document_date', label: 'Document Date', aliases: ['invoice_date', 'bill_date', 'date'] },
    { key: 'due_date', label: 'Due Date' },
    { key: 'currency_code', label: 'Currency', aliases: ['currency'] },
    { key: 'confidence', label: 'Confidence' },
];

const TOTAL_FIELDS = [
    { key: 'subtotal', label: 'Subtotal', aliases: ['sub_total'] },
    { key: 'discount_amount', label: 'Discount' },
    { key: 'tax_amount', label: 'Tax' },
    { key: 'shipping_amount', label: 'Shipping' },
    { key: 'total', label: 'Total', aliases: ['grand_total', 'total_amount', 'amount'] },
    { key: 'amount_due', label: 'Amount Due', aliases: ['balance_due'] },
];

const LINE_ITEM_KEYS = ['line_items', 'lines', 'items', 'products', 'services'];

const PARTY_KEYS = [
    'extracted_party',
    'party',
    'vendor',
    'supplier',
    'customer',
    'client',
    'bill_to',
    'ship_to',
];

const EXCLUDED_EXTRACTION_KEYS = [
    ...LINE_ITEM_KEYS,
    ...PARTY_KEYS,
    'warnings',
    'raw',
    'raw_text',
    'metadata',
    'confidence',
    'subtotal',
    'sub_total',
    'discount_amount',
    'tax_amount',
    'shipping_amount',
    'total',
    'grand_total',
    'total_amount',
    'amount',
    'amount_due',
    'balance_due',
];

function hasPerm(perms, key) {
    return !!(perms && perms[key]);
}

function docKey(doc) {
    return doc?.public_id;
}

function isUuidLike(value) {
    if (value === null || value === undefined) return false;

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value).trim(),
    );
}

function isIdLikeKey(key) {
    return /(^id$|_id$|uuid|guid|token|hash|password|secret)/i.test(String(key || ''));
}

function humanize(value) {
    if (value === null || value === undefined || value === '') return '-';

    return String(value)
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeDisplay(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback;
    if (isUuidLike(value)) return fallback;

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : fallback;
    }

    return String(value);
}

function cleanExtractionValue(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback;
    if (isUuidLike(value)) return fallback;

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : fallback;
    }

    if (Array.isArray(value)) {
        const cleaned = value
            .map((item) => {
                if (item === null || item === undefined || item === '') return null;
                if (isUuidLike(item)) return null;
                if (typeof item === 'object') return null;
                return safeDisplay(item, null);
            })
            .filter(Boolean);

        return cleaned.length ? cleaned.join(', ') : fallback;
    }

    if (typeof value === 'object') {
        const cleaned = Object.entries(value)
            .filter(([key, item]) => !isIdLikeKey(key) && !isUuidLike(item) && item !== null && item !== undefined && item !== '')
            .map(([key, item]) => `${humanize(key)}: ${safeDisplay(item)}`);

        return cleaned.length ? cleaned.join(', ') : fallback;
    }

    return safeDisplay(value, fallback);
}

function money(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';
}

function fileSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function toOptions(items = []) {
    return items.map((item) => (typeof item === 'string'
        ? { value: item, label: humanize(item) }
        : { ...item, label: humanize(item.label || item.value) }));
}

function formatList(items = []) {
    const cleaned = items
        .map((item) => cleanExtractionValue(item))
        .filter((item) => item && item !== '-');

    return cleaned.length ? cleaned.join(', ') : '-';
}

function recalcLines(lines = []) {
    const next = lines.map((line) => {
        const qty = Number(line.qty || 1);
        const rate = Number(line.unit_price || 0);
        const discount = Number(line.discount_amount || 0);
        const tax = Number(line.tax_amount || 0);

        return {
            ...line,
            qty,
            unit_price: rate,
            discount_amount: discount,
            tax_amount: tax,
            line_total: Number(((qty * rate) - discount + tax).toFixed(2)),
        };
    });

    const total = next.reduce((sum, line) => sum + Number(line.line_total || 0), 0);

    return { lines: next, total: Number(total.toFixed(2)) };
}

function pickValue(source = {}, keys = []) {
    for (const key of keys) {
        if (source?.[key] !== null && source?.[key] !== undefined && source?.[key] !== '') {
            return source[key];
        }
    }

    return null;
}

function getFirstObject(source = {}, keys = []) {
    for (const key of keys) {
        const value = source?.[key];

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value;
        }
    }

    return {};
}

function getExtractedParty(normalized = {}, payload = {}) {
    return getFirstObject(normalized, PARTY_KEYS)
        || getFirstObject(payload, PARTY_KEYS)
        || {};
}

function getLineItems(normalized = {}, payload = {}) {
    for (const source of [normalized, payload]) {
        for (const key of LINE_ITEM_KEYS) {
            if (Array.isArray(source?.[key])) {
                return source[key];
            }
        }
    }

    return [];
}

function normalizeLineItem(line = {}) {
    const qty = Number(pickValue(line, ['qty', 'quantity']) || 1);
    const unitPrice = Number(pickValue(line, ['unit_price', 'rate', 'price']) || 0);
    const discount = Number(pickValue(line, ['discount_amount', 'discount']) || 0);
    const tax = Number(pickValue(line, ['tax_amount', 'tax']) || 0);
    const suppliedTotal = pickValue(line, ['line_total', 'total', 'amount']);

    return {
        ...line,
        product_id: pickValue(line, ['product_id', 'matched_product_id']) || null,
        product_name: pickValue(line, ['product_name', 'name', 'item']) || null,
        description: pickValue(line, ['description', 'details', 'product_name', 'name', 'item']) || '',
        qty: Number.isFinite(qty) ? qty : 1,
        unit: pickValue(line, ['unit', 'uom', 'unit_name']) || '',
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
        discount_amount: Number.isFinite(discount) ? discount : 0,
        tax_amount: Number.isFinite(tax) ? tax : 0,
        line_total: Number.isFinite(Number(suppliedTotal))
            ? Number(suppliedTotal)
            : Number(((qty * unitPrice) - discount + tax).toFixed(2)),
    };
}

function reviewLinesFromData(payload = {}, data = {}) {
    const normalized = data?.extraction?.normalized_json || {};
    const candidates = [
        payload.lines,
        payload.line_items,
        payload.items,
        payload.products,
        payload.services,
        data?.mapped_payload?.lines,
        data?.mapped_payload?.line_items,
        normalized.lines,
        normalized.line_items,
        normalized.items,
        normalized.products,
        normalized.services,
    ];

    const lines = candidates.find((items) => Array.isArray(items) && items.length > 0) || [];
    return lines.map(normalizeLineItem);
}

function buildKnownRows(source = {}, fields = []) {
    const rows = [];

    fields.forEach((field) => {
        const value = pickValue(source, [field.key, ...(field.aliases || [])]);
        const display = cleanExtractionValue(value);

        if (display !== '-') {
            rows.push({
                key: field.key,
                field: field.label,
                value: display,
            });
        }
    });

    return rows;
}

function buildObjectRows(source = {}, excluded = []) {
    const excludedSet = new Set(excluded);
    const rows = [];

    Object.entries(source || {}).forEach(([key, value]) => {
        if (excludedSet.has(key)) return;
        if (isIdLikeKey(key)) return;
        if (Array.isArray(value)) return;
        if (value && typeof value === 'object') return;

        const display = cleanExtractionValue(value);

        if (display !== '-') {
            rows.push({
                key,
                field: humanize(key),
                value: display,
            });
        }
    });

    return rows;
}

function getLineValue(row, keys = []) {
    return cleanExtractionValue(pickValue(row, keys));
}

function optionLabel(row) {
    return row.display_name
        || row.name
        || row.code
        || row.label
        || row.title
        || row.email
        || row.number
        || row.reference
        || row.original_name
        || row.original_file_name
        || 'Record';
}

export default function DocumentUploadIndex() {
    const { token } = theme.useToken();
    const { props } = usePage();
    const config = props.config || {};
    const permissions = props.permissions || {};

    const [documents, setDocuments] = useState({ data: [], total: 0 });
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: '', status: undefined, document_type: undefined, range: null });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [uploadForm] = Form.useForm();

    const [editOpen, setEditOpen] = useState(false);
    const [editDoc, setEditDoc] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editForm] = Form.useForm();

    const [previewDoc, setPreviewDoc] = useState(null);
    const [extractDoc, setExtractDoc] = useState(null);
    const [extractData, setExtractData] = useState(null);
    const [extractLoading, setExtractLoading] = useState(false);

    const [matchDoc, setMatchDoc] = useState(null);
    const [matchData, setMatchData] = useState([]);
    const [matchLoading, setMatchLoading] = useState(false);

    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewDoc, setReviewDoc] = useState(null);
    const [reviewType, setReviewType] = useState('purchase_bill');
    const [reviewData, setReviewData] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewSaving, setReviewSaving] = useState(false);
    const [converting, setConverting] = useState(false);
    const [reviewForm] = Form.useForm();

    const transactionTypeOptions = useMemo(() => toOptions(config.transaction_types || []), [config.transaction_types]);
    const documentTypeOptions = useMemo(() => toOptions(config.document_types || []), [config.document_types]);

    const stats = useMemo(() => {
        const list = documents.data || [];

        return {
            uploaded: list.filter((doc) => doc.status === 'uploaded').length,
            processing: list.filter((doc) => ['queued', 'processing'].includes(doc.status)).length,
            needs_review: list.filter((doc) => doc.status === 'needs_review').length,
            converted: list.filter((doc) => doc.status === 'converted').length,
            failed: list.filter((doc) => doc.status === 'failed').length,
        };
    }, [documents.data]);

    const styles = useMemo(() => ({
        page: { padding: 24, minHeight: '100%', background: token.colorBgLayout },
        appHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 16,
            alignItems: 'center',
            padding: 20,
            borderRadius: 12,
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: token.boxShadowTertiary,
        },
        appHeaderLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
        },
        appIcon: {
            width: 46,
            height: 46,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            fontSize: 22,
        },
        header: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16, alignItems: 'flex-start' },
        title: { margin: 0, color: token.colorText },
        subtitle: { margin: '4px 0 0', color: token.colorTextSecondary },
        statGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 12, marginBottom: 16 },
        filters: { marginBottom: 16 },
        filterInner: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
        card: { borderRadius: 8, borderColor: token.colorBorderSecondary },
        iframe: { width: '100%', height: '72vh', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, background: token.colorBgContainer },
        drawerBody: { paddingBottom: 72 },
        actionBar: { position: 'absolute', right: 0, bottom: 0, left: 0, padding: '12px 24px', background: token.colorBgElevated, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'flex-end', gap: 8 },
    }), [token]);

    const fetchDocs = async (overrides = {}) => {
        const nextPage = overrides.page ?? page;
        const nextPageSize = overrides.pageSize ?? pageSize;

        setLoading(true);

        try {
            const range = filters.range || [];
            const { data } = await axios.get('/api/document-uploads', {
                params: {
                    search: filters.search || undefined,
                    status: filters.status || undefined,
                    document_type: filters.document_type || undefined,
                    date_from: range?.[0]?.format?.('YYYY-MM-DD'),
                    date_to: range?.[1]?.format?.('YYYY-MM-DD'),
                    page: nextPage,
                    per_page: nextPageSize,
                },
            });

            setDocuments(data);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, filters.status, filters.document_type]);

    const handleUpload = async () => {
        let values;

        try {
            values = await uploadForm.validateFields();
        } catch {
            return;
        }

        if (!fileList.length) {
            antMessage.warning('Please choose a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileList[0].originFileObj || fileList[0]);
        formData.append('label', values.label);

        if (values.document_type) formData.append('document_type', values.document_type);
        if (values.notes) formData.append('notes', values.notes);

        setUploading(true);

        try {
            await axios.post('/api/document-uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            antMessage.success('Document uploaded.');
            setUploadOpen(false);
            uploadForm.resetFields();
            setFileList([]);
            fetchDocs();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const scanDoc = async (doc) => {
        const key = docKey(doc);
        if (!key) return;

        try {
            const { data } = await axios.post(`/api/document-uploads/${key}/scan-ai`);
            antMessage.success(data.message || 'Scan queued.');
            fetchDocs();
            pollExtractionStatus(key);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Scan failed');
        }
    };

    const pollExtractionStatus = (key, attempt = 0) => {
        if (!key || attempt > 24) return;

        window.setTimeout(async () => {
            try {
                const { data } = await axios.get(`/api/document-uploads/${key}/extraction`);
                const status = data?.extraction?.status;

                if (['completed', 'failed'].includes(status)) {
                    fetchDocs();
                    return;
                }

                pollExtractionStatus(key, attempt + 1);
            } catch {
                if (attempt < 3) pollExtractionStatus(key, attempt + 1);
            }
        }, 2500);
    };

    const openExtraction = async (doc) => {
        const key = docKey(doc);
        if (!key) return;

        setExtractDoc(doc);
        setExtractData(null);
        setExtractLoading(true);

        try {
            const { data } = await axios.get(`/api/document-uploads/${key}/extraction`);
            setExtractData(data);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Failed to load extraction');
        } finally {
            setExtractLoading(false);
        }
    };

    const openMatch = async (doc) => {
        const key = docKey(doc);
        if (!key) return;

        setMatchDoc(doc);
        setMatchData([]);
        setMatchLoading(true);

        try {
            const { data } = await axios.post(`/api/document-uploads/${key}/match-entities`);
            setMatchData(data.matches || []);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Match failed');
        } finally {
            setMatchLoading(false);
        }
    };

    const openEdit = (doc) => {
        setEditDoc(doc);
        setEditOpen(true);
        editForm.setFieldsValue({
            label: doc.label,
            document_type: doc.document_type || 'unknown',
            notes: doc.notes || '',
        });
    };

    const handleUpdate = async () => {
        if (!editDoc) return;

        let values;

        try {
            values = await editForm.validateFields();
        } catch {
            return;
        }

        setSavingEdit(true);

        try {
            await axios.patch(`/api/document-uploads/${docKey(editDoc)}`, values);
            antMessage.success('Document updated.');
            setEditOpen(false);
            setEditDoc(null);
            fetchDocs();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Update failed');
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteDoc = async (doc) => {
        Modal.confirm({
            title: 'Delete document?',
            content: doc.label || 'Untitled Document',
            okType: 'danger',
            okText: 'Delete',
            onOk: async () => {
                try {
                    await axios.delete(`/api/document-uploads/${docKey(doc)}`);
                    antMessage.success('Document removed.');
                    fetchDocs();
                } catch (e) {
                    antMessage.error(e.response?.data?.message || 'Delete failed');
                }
            },
        });
    };

    const openReview = async (doc, createNew = false) => {
        setReviewDoc(doc);
        setReviewOpen(true);
        setReviewLoading(true);
        setReviewData(null);

        const type = reviewType || 'purchase_bill';

        try {
            let data;
            const key = docKey(doc);

            if (createNew || !doc.proposals_count) {
                ({ data } = await axios.post(`/api/document-uploads/${key}/proposals`, { transaction_type: type }));
            } else {
                const proposalsResp = await axios.get(`/api/document-uploads/${key}/proposals`);
                const proposal = proposalsResp.data.proposals?.find((item) => item.status !== 'converted') || proposalsResp.data.proposals?.[0];

                if (proposal) {
                    ({ data } = await axios.get(`/api/document-uploads/${key}/proposals/${proposal.id}/review`));
                } else {
                    ({ data } = await axios.post(`/api/document-uploads/${key}/proposals`, { transaction_type: type }));
                }
            }

            setReviewData(data);
            setReviewType(data.transaction_type || type);
            reviewForm.setFieldsValue(normalizeReviewValues(data.mapped_payload || {}, data));
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Could not open review');
        } finally {
            setReviewLoading(false);
        }
    };

    const createProposalForType = async () => {
        if (!reviewDoc) return;

        setReviewLoading(true);

        try {
            const { data } = await axios.post(`/api/document-uploads/${docKey(reviewDoc)}/proposals`, {
                transaction_type: reviewType,
            });

            setReviewData(data);
            reviewForm.setFieldsValue(normalizeReviewValues(data.mapped_payload || {}, data));
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Could not create proposal');
        } finally {
            setReviewLoading(false);
        }
    };

    const saveReview = async () => {
        if (!reviewDoc || !reviewData?.proposal) return null;

        const values = denormalizeReviewValues(await reviewForm.validateFields());
        setReviewSaving(true);

        try {
            const { data } = await axios.put(
                `/api/document-uploads/${docKey(reviewDoc)}/proposals/${reviewData.proposal.id}/review`,
                { review_values: values },
            );

            setReviewData(data);
            reviewForm.setFieldsValue(normalizeReviewValues(data.mapped_payload || {}, data));
            antMessage.success('Review saved.');
            fetchDocs();

            return data;
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Review save failed');
            return null;
        } finally {
            setReviewSaving(false);
        }
    };

    const convertDraft = async (overrideDuplicate = false) => {
        const current = await saveReview();
        const dataForConvert = current || reviewData;

        if (!reviewDoc || !dataForConvert?.proposal) return;

        if (dataForConvert.missing_fields?.length) {
            antMessage.warning('Fill required fields before creating draft transaction.');
            return;
        }

        setConverting(true);

        try {
            const { data } = await axios.post(
                `/api/document-uploads/${docKey(reviewDoc)}/proposals/${dataForConvert.proposal.id}/convert`,
                { override_duplicate: overrideDuplicate },
            );

            antMessage.success(data.message || 'Draft transaction created.');
            setReviewOpen(false);
            setReviewData(null);
            fetchDocs();

            if (data.open_url) window.open(data.open_url, '_blank');
        } catch (e) {
            const resp = e.response?.data;

            if (resp?.code === 'DOCUMENT_DUPLICATE_DETECTED') {
                Modal.confirm({
                    title: 'Possible duplicate found',
                    content: resp.message,
                    okText: 'Proceed Anyway',
                    onOk: () => convertDraft(true),
                });
            } else if (resp?.code === 'DOCUMENT_REVIEW_REQUIRED') {
                antMessage.warning(resp.message || 'Review required before creating draft.');
            } else {
                antMessage.error(resp?.message || 'Convert failed');
            }
        } finally {
            setConverting(false);
        }
    };

    const canUpdate = hasPerm(permissions, 'document_upload.update') || hasPerm(permissions, 'document_upload.edit');

    const columns = [
        {
            title: 'Document',
            dataIndex: 'label',
            render: (value, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{value || 'Untitled Document'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.original_name || '-'}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'document_type',
            width: 150,
            render: (value) => <Tag>{humanize(value || 'unknown')}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 150,
            render: (value) => (
                <Tag color={STATUS_COLORS[value] || 'default'}>
                    {STATUS_LABELS[value] || humanize(value)}
                </Tag>
            ),
        },
        {
            title: 'AI Status',
            width: 140,
            render: (_, record) => record.extraction
                ? <Tag color="blue">{humanize(record.extraction.status)}</Tag>
                : <Tag>No Scan</Tag>,
        },
        {
            title: 'File Size',
            dataIndex: 'size',
            width: 120,
            render: fileSize,
        },
        {
            title: 'Uploaded',
            dataIndex: 'created_at',
            width: 170,
            render: (value) => (value ? new Date(value).toLocaleString() : '-'),
        },
        {
            title: '',
            key: 'actions',
            fixed: 'right',
            width: 72,
            render: (_, record) => (
                <DocumentActionMenu
                    doc={record}
                    permissions={permissions}
                    canUpdate={canUpdate}
                    onPreview={() => setPreviewDoc(record)}
                    onEdit={() => openEdit(record)}
                    onScan={() => scanDoc(record)}
                    onExtraction={() => openExtraction(record)}
                    onMatch={() => openMatch(record)}
                    onReview={() => openReview(record)}
                    onCreateProposal={() => openReview(record, true)}
                    onDownload={() => window.open(`/api/document-uploads/${docKey(record)}/preview`, '_blank')}
                    onDelete={() => deleteDoc(record)}
                />
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Documents" />

            <div style={styles.page}>
                <div style={styles.appHeader}>
                    <div style={styles.appHeaderLeft}>
                        <div style={styles.appIcon}>
                            <FileTextOutlined />
                        </div>
                        <div>
                            <Title level={3} style={styles.title}>Document Intelligence</Title>
                            <Paragraph style={styles.subtitle}>
                                Upload, scan, review, and convert business documents into draft transactions.
                            </Paragraph>
                        </div>
                    </div>

                    <Space wrap>
                        <Button
                            icon={<ScanOutlined />}
                            onClick={() => documents.data?.[0] && scanDoc(documents.data[0])}
                            disabled={!documents.data?.[0] || !hasPerm(permissions, 'document_upload.scan_ai')}
                        >
                            Run AI Scan
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => fetchDocs({ page })}>
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={!hasPerm(permissions, 'document_upload.create')}
                            onClick={() => setUploadOpen(true)}
                        >
                            Upload Document
                        </Button>
                    </Space>
                </div>

                <div style={styles.statGrid}>
                    {Object.entries(stats).map(([key, value]) => (
                        <Card key={key} size="small" style={styles.card}>
                            <Statistic title={STATUS_LABELS[key]} value={value} />
                        </Card>
                    ))}
                </div>

                <Card size="small" style={{ ...styles.card, ...styles.filters }}>
                    <div style={styles.filterInner}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Search documents..."
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            onPressEnter={() => {
                                setPage(1);
                                fetchDocs({ page: 1 });
                            }}
                            style={{ width: 280 }}
                        />

                        <Select
                            allowClear
                            placeholder="Status"
                            value={filters.status}
                            onChange={(status) => {
                                setFilters((prev) => ({ ...prev, status }));
                                setPage(1);
                            }}
                            style={{ width: 170 }}
                            options={Object.keys(STATUS_COLORS).map((status) => ({
                                value: status,
                                label: STATUS_LABELS[status] || humanize(status),
                            }))}
                        />

                        <Select
                            allowClear
                            placeholder="Document type"
                            value={filters.document_type}
                            onChange={(document_type) => {
                                setFilters((prev) => ({ ...prev, document_type }));
                                setPage(1);
                            }}
                            style={{ width: 190 }}
                            options={documentTypeOptions}
                        />

                        <RangePicker
                            value={filters.range}
                            onChange={(range) => setFilters((prev) => ({ ...prev, range }))}
                        />

                        <Button
                            onClick={() => {
                                setFilters({ search: '', status: undefined, document_type: undefined, range: null });
                                setPage(1);
                            }}
                        >
                            Reset
                        </Button>

                        <Button
                            type="primary"
                            onClick={() => {
                                setPage(1);
                                fetchDocs({ page: 1 });
                            }}
                        >
                            Apply
                        </Button>
                    </div>
                </Card>

                <Card size="small" style={styles.card}>
                    <Table
                        size="small"
                        rowKey="public_id"
                        loading={loading}
                        dataSource={documents.data || []}
                        columns={columns}
                        scroll={{ x: 1100 }}
                        pagination={{
                            current: page,
                            pageSize,
                            total: documents.meta?.total || documents.total || 0,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                            onChange: (nextPage, nextPageSize) => {
                                setPage(nextPage);
                                setPageSize(nextPageSize);
                            },
                        }}
                    />
                </Card>

                <UploadModal
                    open={uploadOpen}
                    form={uploadForm}
                    fileList={fileList}
                    setFileList={setFileList}
                    uploading={uploading}
                    documentTypeOptions={documentTypeOptions}
                    maxMb={config.max_upload_mb || 10}
                    onOk={handleUpload}
                    onCancel={() => {
                        setUploadOpen(false);
                        uploadForm.resetFields();
                        setFileList([]);
                    }}
                />

                <EditModal
                    open={editOpen}
                    form={editForm}
                    doc={editDoc}
                    saving={savingEdit}
                    documentTypeOptions={documentTypeOptions}
                    onOk={handleUpdate}
                    onCancel={() => {
                        setEditOpen(false);
                        setEditDoc(null);
                        editForm.resetFields();
                    }}
                />

                <PreviewModal
                    doc={previewDoc}
                    styles={styles}
                    onClose={() => setPreviewDoc(null)}
                />

                <ExtractionModal
                    doc={extractDoc}
                    data={extractData}
                    loading={extractLoading}
                    styles={styles}
                    onClose={() => {
                        setExtractDoc(null);
                        setExtractData(null);
                    }}
                />

                <MatchModal
                    doc={matchDoc}
                    data={matchData}
                    loading={matchLoading}
                    onClose={() => setMatchDoc(null)}
                />

                <DocumentReviewDrawer
                    open={reviewOpen}
                    doc={reviewDoc}
                    type={reviewType}
                    setType={setReviewType}
                    data={reviewData}
                    loading={reviewLoading}
                    saving={reviewSaving}
                    converting={converting}
                    form={reviewForm}
                    styles={styles}
                    transactionTypeOptions={transactionTypeOptions}
                    permissions={permissions}
                    onCreateProposal={createProposalForType}
                    onSave={saveReview}
                    onConvert={() => convertDraft(false)}
                    onClose={() => {
                        setReviewOpen(false);
                        setReviewData(null);
                        setReviewDoc(null);
                    }}
                />
            </div>
        </AuthenticatedLayout>
    );
}

function normalizeReviewValues(payload, data = {}) {
    const next = { ...payload };

    [
        'bill_date',
        'invoice_date',
        'expense_date',
        'payment_date',
        'sales_return_date',
        'debit_note_date',
        'purchase_order_date',
        'sales_order_date',
        'quotation_date',
        'due_date',
        'expiry_date',
    ].forEach((field) => {
        if (next[field]) next[field] = dayjs(next[field]);
    });

    next.lines = reviewLinesFromData(payload, data);

    return next;
}

function denormalizeReviewValues(values) {
    const next = { ...values };

    Object.keys(next).forEach((key) => {
        if (dayjs.isDayjs(next[key])) next[key] = next[key].format('YYYY-MM-DD');
    });

    const recalculated = recalcLines(next.lines || []);
    next.lines = recalculated.lines;

    if (!['customer_payment', 'supplier_payment'].includes(next.transaction_type)) {
        next.total = Number(next.total || recalculated.total);
    }

    return next;
}

function DocumentActionMenu({
    doc,
    permissions,
    canUpdate,
    onPreview,
    onEdit,
    onScan,
    onExtraction,
    onMatch,
    onReview,
    onCreateProposal,
    onDownload,
    onDelete,
}) {
    const canScan = ['uploaded', 'failed', 'needs_review', 'extracted'].includes(doc.status)
        && hasPerm(permissions, 'document_upload.scan_ai');

    const hasExtraction = !!doc.extraction;

    const items = [
        { key: 'preview', icon: <EyeOutlined />, label: 'Preview Document', onClick: onPreview },
        canUpdate && { key: 'edit', icon: <EditOutlined />, label: 'Edit Details', onClick: onEdit },
        {
            key: 'scan',
            icon: <ScanOutlined />,
            label: doc.status === 'failed' ? 'Retry AI Scan' : 'Run AI Scan',
            disabled: !canScan,
            onClick: onScan,
        },
        {
            key: 'extraction',
            icon: <FileTextOutlined />,
            label: 'View Extraction',
            disabled: !hasExtraction || !hasPerm(permissions, 'document_upload.extract.view'),
            onClick: onExtraction,
        },
        {
            key: 'match',
            icon: <ToolOutlined />,
            label: 'Entity Matches',
            disabled: !hasExtraction || !hasPerm(permissions, 'document_upload.entity_match'),
            onClick: onMatch,
        },
        {
            key: 'proposal',
            icon: <PlusOutlined />,
            label: 'Create Proposal',
            disabled: !hasExtraction || doc.status === 'converted',
            onClick: onCreateProposal,
        },
        {
            key: 'review',
            icon: <SwapOutlined />,
            label: doc.status === 'converted' ? 'Open Draft Record' : 'Review Transaction',
            disabled: !hasExtraction,
            onClick: onReview,
        },
        { key: 'download', icon: <DownloadOutlined />, label: 'Download', onClick: onDownload },
        hasPerm(permissions, 'document_upload.delete') && { type: 'divider' },
        hasPerm(permissions, 'document_upload.delete') && {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: onDelete,
        },
    ].filter(Boolean);

    return (
        <Dropdown menu={{ items }} trigger={['click']}>
            <Tooltip title="Actions">
                <Button icon={<MoreOutlined />} />
            </Tooltip>
        </Dropdown>
    );
}

function RemoteSelect({ endpoint, value, onChange, placeholder, selectedLabel }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resolvedLabel, setResolvedLabel] = useState(selectedLabel || null);

    const load = async (search = '') => {
        setLoading(true);

        try {
            const { data } = await axios.get(endpoint, {
                params: { search, per_page: 20 },
            });

            const rows = Array.isArray(data) ? data : data.results || data.data || [];

            setOptions(rows.map((row) => ({
                value: row.id,
                label: optionLabel(row),
            })));
        } catch {
            setOptions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    useEffect(() => {
        setResolvedLabel(selectedLabel || null);
    }, [selectedLabel, value]);

    useEffect(() => {
        if (!value || selectedLabel || options.some((item) => String(item.value) === String(value))) {
            return;
        }

        let active = true;
        const loadSelected = async () => {
            try {
                const { data } = await axios.get(`${String(endpoint).replace(/\/+$/, '')}/${value}`);
                const record = data?.result || data?.data || data;
                const label = record && typeof record === 'object' ? optionLabel(record) : null;

                if (active && label && label !== 'Record') {
                    setResolvedLabel(label);
                }
            } catch {
                // The list endpoint may not expose a show route. Keep the safe label fallback.
            }
        };

        void loadSelected();

        return () => {
            active = false;
        };
    }, [endpoint, options, selectedLabel, value]);

    const displayOptions = useMemo(() => {
        const next = [...options];

        if (value && !next.some((item) => String(item.value) === String(value))) {
            next.unshift({
                value,
                label: resolvedLabel || (isUuidLike(value) ? 'Linked record' : safeDisplay(value)),
            });
        }

        return next;
    }, [options, resolvedLabel, value]);

    return (
        <Select
            showSearch
            allowClear
            value={value}
            onChange={onChange}
            onSearch={load}
            loading={loading}
            filterOption={false}
            placeholder={placeholder}
            options={displayOptions}
        />
    );
}

function ReviewField({ schema, form, doc, onFkCreated }) {
    const createRecord = async () => {
        if (!schema.match_id) {
            antMessage.warning('Run entity matching before creating this linked record.');
            return;
        }

        const source = schema.create_payload || {};
        const fields = {
            name: source.name,
            email: source.email,
            phone: source.phone,
            address: source.address,
            tax_number: source.tax_number,
        };

        try {
            const { data } = await axios.post(`/api/document-uploads/${docKey(doc)}/create-missing-fk`, {
                match_id: schema.match_id,
                fields,
            });

            form.setFieldValue(schema.field, data.record.id);
            antMessage.success(`${schema.label} created and linked.`);
            onFkCreated?.();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Could not create linked record');
        }
    };

    const input = schema.type === 'fk_select'
        ? (
            <RemoteSelect
                endpoint={schema.endpoint}
                placeholder={schema.placeholder}
                selectedLabel={
                    schema.selected_label
                    || schema.matched_label
                    || schema.create_payload?.name
                    || schema.create_payload?.code
                    || schema.create_payload?.email
                    || null
                }
            />
        )
        : schema.type === 'date'
            ? <DatePicker style={{ width: '100%' }} />
            : schema.type === 'money'
                ? <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                : schema.type === 'textarea'
                    ? <Input.TextArea rows={3} />
                    : <Input />;

    if (schema.type === 'line_items' || schema.type === 'line_fk_select') return null;

    return (
        <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <Form.Item
                label={schema.label}
                name={schema.field}
                rules={[{ required: schema.required, message: `${schema.label} is required` }]}
            >
                {input}
            </Form.Item>

            {schema.create_allowed && (
                <Button size="small" icon={<PlusOutlined />} onClick={createRecord}>
                    {schema.create_label || `Create ${schema.label}`}
                </Button>
            )}
        </Space>
    );
}

function DocumentReviewDrawer({
    open,
    doc,
    type,
    setType,
    data,
    loading,
    saving,
    converting,
    form,
    styles,
    transactionTypeOptions,
    permissions,
    onCreateProposal,
    onSave,
    onConvert,
    onClose,
}) {
    const payload = data?.mapped_payload || {};
    const normalized = data?.extraction?.normalized_json || {};
    const document = data?.document || doc || {};
    const party = getExtractedParty(normalized, payload);
    const totals = normalized?.totals || normalized;

    const lineColumns = [
        {
            title: 'Product',
            dataIndex: 'product_id',
            width: 210,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'product_id']} style={{ margin: 0 }}>
                    <RemoteSelect endpoint="/api/products" placeholder="Product" />
                </Form.Item>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'description']} style={{ margin: 0 }}>
                    <Input />
                </Form.Item>
            ),
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            width: 95,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'qty']} style={{ margin: 0 }}>
                    <InputNumber min={0} precision={4} style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            width: 90,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'unit']} style={{ margin: 0 }}>
                    <Input />
                </Form.Item>
            ),
        },
        {
            title: 'Rate',
            dataIndex: 'unit_price',
            width: 110,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'unit_price']} style={{ margin: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Discount',
            dataIndex: 'discount_amount',
            width: 110,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'discount_amount']} style={{ margin: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Tax',
            dataIndex: 'tax_amount',
            width: 110,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'tax_amount']} style={{ margin: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Account',
            dataIndex: 'account_id',
            width: 190,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'account_id']} style={{ margin: 0 }}>
                    <RemoteSelect endpoint="/api/accounts" placeholder="Account" />
                </Form.Item>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'line_total',
            width: 110,
            render: (_, row, index) => (
                <Form.Item name={['lines', index, 'line_total']} style={{ margin: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'warning',
            width: 130,
            render: (value) => value ? <Tag color="gold">{value}</Tag> : <Tag color="green">Ready</Tag>,
        },
    ];

    return (
        <Drawer
            title={doc ? `Review Before Creating - ${doc.label || 'Document'}` : 'Review Before Creating'}
            open={open}
            width="86vw"
            onClose={onClose}
            destroyOnClose
        >
            <div style={styles.drawerBody}>
                {loading ? (
                    <Card loading />
                ) : (
                    <Form form={form} layout="vertical">
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Card size="small" style={styles.card}>
                                <Space wrap align="end">
                                    <div>
                                        <Text strong>Selected Transaction Type</Text>
                                        <Select
                                            value={type}
                                            onChange={setType}
                                            options={transactionTypeOptions}
                                            style={{ width: 260, display: 'block', marginTop: 6 }}
                                        />
                                    </div>

                                    <Button onClick={onCreateProposal}>Create Proposal</Button>

                                    {data?.proposal?.status && (
                                        <Tag color={data.can_convert ? 'green' : 'gold'}>
                                            {humanize(data.proposal.status)}
                                        </Tag>
                                    )}
                                </Space>
                            </Card>

                            {data?.missing_fields?.length > 0 && (
                                <Alert
                                    type="warning"
                                    message="Fill required fields before creating draft transaction."
                                    description={formatList(data.missing_fields)}
                                />
                            )}

                            {data?.warnings?.length > 0 && (
                                <Alert
                                    type="info"
                                    message="Review warnings"
                                    description={formatList(data.warnings)}
                                />
                            )}

                            <Card size="small" title="Document Details" style={styles.card}>
                                <Descriptions size="small" column={3}>
                                    <Descriptions.Item label="Label">{safeDisplay(document.label)}</Descriptions.Item>
                                    <Descriptions.Item label="Original File">{safeDisplay(document.original_name)}</Descriptions.Item>
                                    <Descriptions.Item label="Status">{humanize(document.status || '-')}</Descriptions.Item>
                                    <Descriptions.Item label="Uploaded">{document.created_at ? dayjs(document.created_at).format('DD MMM YYYY, HH:mm') : '-'}</Descriptions.Item>
                                    <Descriptions.Item label="File Size">{fileSize(document.size)}</Descriptions.Item>
                                    <Descriptions.Item label="Notes">{safeDisplay(document.notes)}</Descriptions.Item>
                                </Descriptions>
                            </Card>

                            <Card size="small" title="Document Summary" style={styles.card}>
                                <Descriptions size="small" column={3}>
                                    <Descriptions.Item label="Document Type">
                                        {humanize(normalized.document_type || doc?.document_type || 'unknown')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Number">
                                        {safeDisplay(normalized.document_number)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Date">
                                        {safeDisplay(normalized.document_date)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Due Date">
                                        {safeDisplay(normalized.due_date)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Currency">
                                        {safeDisplay(normalized.currency_code)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Confidence">
                                        {data?.confidence !== null && data?.confidence !== undefined
                                            ? `${Math.round(data.confidence * 100)}%`
                                            : '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Subtotal">
                                        {money(pickValue(totals, ['subtotal', 'sub_total']))}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Discount">
                                        {money(pickValue(totals, ['discount_amount', 'discount']))}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Tax">
                                        {money(pickValue(totals, ['tax_amount', 'tax']))}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Total">
                                        {money(pickValue(totals, ['grand_total', 'total', 'total_amount']))}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Amount Due">
                                        {money(pickValue(totals, ['amount_due', 'balance_due']))}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            <Card size="small" title="Extracted Party" style={styles.card}>
                                <Descriptions size="small" column={2}>
                                    <Descriptions.Item label="Name">
                                        {safeDisplay(party.name)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Role">
                                        {humanize(party.role || '-')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Email">
                                        {safeDisplay(party.email)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Phone">
                                        {safeDisplay(party.phone)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Tax Number">
                                        {safeDisplay(party.tax_number)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Address">
                                        {safeDisplay(party.address)}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            <Card size="small" title="Transaction Details" style={styles.card}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                    {(data?.review_schema || []).map((field) => (
                                        <ReviewField
                                            key={field.field}
                                            schema={field}
                                            form={form}
                                            doc={doc}
                                            onFkCreated={onSave}
                                        />
                                    ))}
                                </div>
                            </Card>

                            <Card size="small" title="Line Items" style={styles.card}>
                                <Form.List name="lines">
                                    {(fields, { add, remove }) => (
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Table
                                                size="small"
                                                rowKey="key"
                                                pagination={false}
                                                dataSource={fields}
                                                columns={[
                                                    ...lineColumns,
                                                    {
                                                        title: '',
                                                        width: 60,
                                                        render: (_, row) => (
                                                            <Button
                                                                danger
                                                                size="small"
                                                                icon={<DeleteOutlined />}
                                                                onClick={() => remove(row.name)}
                                                            />
                                                        ),
                                                    },
                                                ]}
                                                scroll={{ x: 1350 }}
                                            />

                                            <Button
                                                icon={<PlusOutlined />}
                                                onClick={() => add({
                                                    qty: 1,
                                                    unit_price: 0,
                                                    discount_amount: 0,
                                                    tax_amount: 0,
                                                    line_total: 0,
                                                })}
                                            >
                                                Add Line
                                            </Button>
                                        </Space>
                                    )}
                                </Form.List>

                                <Form.Item shouldUpdate noStyle>
                                    {() => {
                                        const values = form.getFieldsValue();
                                        const { total } = recalcLines(values.lines || []);

                                        return <Text strong>Total: {money(values.total || total)}</Text>;
                                    }}
                                </Form.Item>
                            </Card>

                            <ExtractedDataTables
                                normalized={normalized}
                                payload={payload}
                                styles={styles}
                            />
                        </Space>
                    </Form>
                )}
            </div>

            <div style={styles.actionBar}>
                <Button onClick={onClose}>Cancel</Button>
                <Button icon={<ScanOutlined />} disabled={!doc || !hasPerm(permissions, 'document_upload.scan_ai')}>
                    Re-run AI Scan
                </Button>
                <Button loading={saving} onClick={onSave}>Save Review</Button>
                <Button
                    type="primary"
                    loading={converting}
                    disabled={!data?.can_convert || !hasPerm(permissions, 'document_upload.convert')}
                    onClick={onConvert}
                >
                    Create Draft Transaction
                </Button>
            </div>
        </Drawer>
    );
}

function KeyValueTable({ rows }) {
    return (
        <Table
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={rows}
            columns={[
                {
                    title: 'Field',
                    dataIndex: 'field',
                    width: 260,
                    render: (value) => <Text strong>{value}</Text>,
                },
                {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value) => <Text>{safeDisplay(value)}</Text>,
                },
            ]}
        />
    );
}

function ExtractedLineItemsTable({ items }) {
    return (
        <Table
            size="small"
            rowKey={(_, index) => index}
            pagination={false}
            dataSource={items}
            scroll={{ x: 900 }}
            columns={[
                {
                    title: 'Item / Description',
                    render: (_, row) => getLineValue(row, [
                        'description',
                        'item',
                        'name',
                        'product_name',
                        'service_name',
                        'details',
                    ]),
                },
                {
                    title: 'Qty',
                    width: 90,
                    align: 'right',
                    render: (_, row) => getLineValue(row, ['qty', 'quantity']),
                },
                {
                    title: 'Unit',
                    width: 90,
                    render: (_, row) => getLineValue(row, ['unit', 'uom']),
                },
                {
                    title: 'Rate',
                    width: 120,
                    align: 'right',
                    render: (_, row) => getLineValue(row, ['unit_price', 'rate', 'price']),
                },
                {
                    title: 'Discount',
                    width: 120,
                    align: 'right',
                    render: (_, row) => getLineValue(row, ['discount_amount', 'discount']),
                },
                {
                    title: 'Tax',
                    width: 120,
                    align: 'right',
                    render: (_, row) => getLineValue(row, ['tax_amount', 'tax']),
                },
                {
                    title: 'Amount',
                    width: 130,
                    align: 'right',
                    render: (_, row) => getLineValue(row, ['line_total', 'total', 'amount']),
                },
            ]}
        />
    );
}

function ExtractedDataTables({ normalized = {}, payload = {}, styles }) {
    const summaryRows = buildKnownRows(normalized, SUMMARY_FIELDS);
    const totalRows = buildKnownRows(normalized.totals || normalized, TOTAL_FIELDS);
    const partyRows = buildObjectRows(getExtractedParty(normalized, payload));
    const otherRows = buildObjectRows(normalized, EXCLUDED_EXTRACTION_KEYS);
    const lineItems = getLineItems(normalized, payload);

    const hasAnyData = summaryRows.length
        || totalRows.length
        || partyRows.length
        || otherRows.length
        || lineItems.length;

    if (!hasAnyData) {
        return (
            <Alert
                type="info"
                message="No extracted table data available."
            />
        );
    }

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {summaryRows.length > 0 && (
                <Card size="small" title="Extracted Document Details" style={styles.card}>
                    <KeyValueTable rows={summaryRows} />
                </Card>
            )}

            {partyRows.length > 0 && (
                <Card size="small" title="Extracted Party Details" style={styles.card}>
                    <KeyValueTable rows={partyRows} />
                </Card>
            )}

            {totalRows.length > 0 && (
                <Card size="small" title="Extracted Totals" style={styles.card}>
                    <KeyValueTable rows={totalRows} />
                </Card>
            )}

            {lineItems.length > 0 && (
                <Card size="small" title="Extracted Line Items" style={styles.card}>
                    <ExtractedLineItemsTable items={lineItems} />
                </Card>
            )}

            {otherRows.length > 0 && (
                <Card size="small" title="Other Extracted Fields" style={styles.card}>
                    <KeyValueTable rows={otherRows} />
                </Card>
            )}
        </Space>
    );
}

function UploadModal({
    open,
    form,
    fileList,
    setFileList,
    uploading,
    documentTypeOptions,
    maxMb,
    onOk,
    onCancel,
}) {
    return (
        <Modal
            title="Upload Document"
            open={open}
            width={720}
            okText="Upload"
            confirmLoading={uploading}
            onOk={onOk}
            onCancel={onCancel}
            destroyOnClose
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Uploaded documents may be processed by the configured AI provider."
            />

            <Form form={form} layout="vertical" initialValues={{ document_type: 'unknown' }}>
                <Form.Item
                    label="Label"
                    name="label"
                    rules={[{ required: true, message: 'Label is required' }]}
                >
                    <Input placeholder="October supplier bill from Acme" />
                </Form.Item>

                <Form.Item label="Document Type" name="document_type">
                    <Select options={documentTypeOptions} />
                </Form.Item>

                <Form.Item label="Notes" name="notes">
                    <Input.TextArea rows={3} placeholder="Optional internal note" />
                </Form.Item>

                <Form.Item label={`File (max ${maxMb} MB)`} required>
                    <Dragger
                        multiple={false}
                        beforeUpload={() => false}
                        fileList={fileList}
                        onChange={({ fileList: next }) => setFileList(next.slice(-1))}
                        accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p>Click or drag file here</p>
                        <p className="ant-upload-hint">PDF, DOCX, JPG, PNG, WEBP</p>
                    </Dragger>
                </Form.Item>
            </Form>
        </Modal>
    );
}

function EditModal({
    open,
    form,
    doc,
    saving,
    documentTypeOptions,
    onOk,
    onCancel,
}) {
    return (
        <Modal
            title={`Edit Document${doc?.label ? ` - ${doc.label}` : ''}`}
            open={open}
            width={640}
            okText="Save Changes"
            confirmLoading={saving}
            onOk={onOk}
            onCancel={onCancel}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Label"
                    name="label"
                    rules={[{ required: true, message: 'Label is required' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item label="Document Type" name="document_type">
                    <Select options={documentTypeOptions} />
                </Form.Item>

                <Form.Item label="Notes" name="notes">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}

function PreviewModal({ doc, styles, onClose }) {
    return (
        <Modal
            title={doc?.label || 'Preview'}
            open={!!doc}
            width={960}
            footer={null}
            onCancel={onClose}
            destroyOnClose
        >
            {doc && (
                <iframe
                    src={`/api/document-uploads/${docKey(doc)}/preview`}
                    style={styles.iframe}
                    title={doc.label || 'Document Preview'}
                />
            )}
        </Modal>
    );
}

function ExtractionModal({ doc, data, loading, styles, onClose }) {
    const normalized = data?.extraction?.normalized_json || {};
    const payload = data?.document?.mapped_payload || data?.mapped_payload || {};
    const document = data?.document || doc || {};

    return (
        <Modal
            title={`Extracted Data${doc?.label ? ` - ${doc.label}` : ''}`}
            open={!!doc}
            width={1040}
            footer={<Button onClick={onClose}>Close</Button>}
            onCancel={onClose}
            destroyOnClose
        >
            {loading ? (
                <Card loading size="small" />
            ) : data?.extraction ? (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap>
                        <Tag color="blue">{humanize(normalized.document_type || 'unknown')}</Tag>
                        <Tag>Status: {humanize(data.extraction.status)}</Tag>
                    </Space>

                    <Card size="small" title="Document Details" style={styles.card}>
                        <Descriptions size="small" column={3}>
                            <Descriptions.Item label="Label">{safeDisplay(document.label)}</Descriptions.Item>
                            <Descriptions.Item label="Original File">{safeDisplay(document.original_name)}</Descriptions.Item>
                            <Descriptions.Item label="Document Type">{humanize(document.document_type || normalized.document_type || 'unknown')}</Descriptions.Item>
                            <Descriptions.Item label="Uploaded">{document.created_at ? dayjs(document.created_at).format('DD MMM YYYY, HH:mm') : '-'}</Descriptions.Item>
                            <Descriptions.Item label="File Size">{fileSize(document.size)}</Descriptions.Item>
                            <Descriptions.Item label="Notes">{safeDisplay(document.notes)}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {normalized.warnings?.length > 0 && (
                        <Alert
                            type="warning"
                            message="Warnings"
                            description={formatList(normalized.warnings)}
                        />
                    )}

                    <ExtractedDataTables
                        normalized={normalized}
                        payload={payload}
                        styles={styles}
                    />
                </Space>
            ) : (
                <Alert type="info" message="No extraction yet." />
            )}
        </Modal>
    );
}

function MatchModal({ doc, data, loading, onClose }) {
    return (
        <Modal
            title={`Entity Matches${doc?.label ? ` - ${doc.label}` : ''}`}
            open={!!doc}
            width={820}
            footer={<Button onClick={onClose}>Close</Button>}
            onCancel={onClose}
            destroyOnClose
        >
            {loading ? (
                <Card loading size="small" />
            ) : (
                <Table
                    size="small"
                    rowKey={(record, index) => record.public_id || index}
                    pagination={false}
                    dataSource={data || []}
                    columns={[
                        {
                            title: 'Type',
                            dataIndex: 'entity_type',
                            width: 140,
                            render: humanize,
                        },
                        {
                            title: 'Extracted Name',
                            dataIndex: 'extracted_name',
                            render: (value) => safeDisplay(value),
                        },
                        {
                            title: 'Status',
                            dataIndex: 'match_status',
                            width: 150,
                            render: (value) => (
                                <Tag
                                    color={
                                        ['matched', 'created', 'user_selected'].includes(value)
                                            ? 'green'
                                            : value === 'suggested'
                                                ? 'gold'
                                                : 'red'
                                    }
                                >
                                    {humanize(value)}
                                </Tag>
                            ),
                        },
                        {
                            title: 'Linked Record',
                            dataIndex: 'matched_id',
                            width: 220,
                            render: (value, record) => {
                                const label = record.matched_label
                                    || record.matched_name
                                    || record.matched_record?.name
                                    || record.matched_record?.label
                                    || record.matched_record?.code;

                                if (label) return safeDisplay(label);
                                if (value && isUuidLike(value)) return <Tag color="green">Linked</Tag>;

                                return safeDisplay(value);
                            },
                        },
                    ]}
                />
            )}
        </Modal>
    );
}
