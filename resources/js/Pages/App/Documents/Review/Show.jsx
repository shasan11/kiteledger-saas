import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Grid,
    Input,
    InputNumber,
    Modal,
    Skeleton,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message as antMessage,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleFilled,
    CheckCircleOutlined,
    EyeOutlined,
    FileDoneOutlined,
    FileTextOutlined,
    LinkOutlined,
    ReloadOutlined,
    SaveOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
    WarningFilled,
} from '@ant-design/icons';
import axios from 'axios';

import DocumentPreview from '../Components/DocumentPreview';
import DocumentProcessingTimeline from '../Components/DocumentProcessingTimeline';
import DocumentStatusTag, { getDocumentStatusIconColor } from '../Components/DocumentStatusTag';
import ReviewField from '../Components/ReviewField';
import ReviewIssuePanel, { fieldLabel } from '../Components/ReviewIssuePanel';
import EntityLinkSelect from '../Components/EntityLinkSelect';
import LineTotalsSummary from '../Components/LineTotalsSummary';
import { humanize } from '../Upload/documentUtils';
import './review.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/* Fields shown in the summary section, in reading order. */
const SUMMARY_FIELDS = [
    'document_type',
    'document_number',
    'document_date',
    'due_date',
    'currency_code',
];

/* Fallback list, used only if the page is rendered without the server's. */
const FALLBACK_DOCUMENT_TYPES = [
    'unknown', 'sales_invoice', 'purchase_bill', 'expense_receipt',
    'customer_payment_slip', 'supplier_payment_slip', 'credit_note',
    'debit_note', 'journal_voucher', 'purchase_order', 'sales_order',
    'quotation', 'warehouse_transfer', 'inventory_adjustment',
    'bank_statement', 'other',
];

const PARTY_FIELDS = [
    'party.name',
    'party.email',
    'party.phone',
    'party.tax_number',
];

const numberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const calculatedLineAmount = (line = {}) => {
    const quantity = numberOrNull(line.quantity);
    const rate = numberOrNull(line.rate);

    if (quantity === null || rate === null) return numberOrNull(line.amount);

    const discount = numberOrNull(line.discount) || 0;
    const tax = numberOrNull(line.tax_amount ?? line.tax) || 0;

    return Math.round(((quantity * rate) - discount + tax) * 100) / 100;
};

const calculatedLineSubtotal = (line = {}) => {
    const quantity = numberOrNull(line.quantity);
    const rate = numberOrNull(line.rate);

    if (quantity !== null && rate !== null) {
        return Math.round(((quantity * rate) - (numberOrNull(line.discount) || 0)) * 100) / 100;
    }

    const amount = numberOrNull(line.amount);

    return amount === null
        ? null
        : Math.round((amount - (numberOrNull(line.tax_amount ?? line.tax) || 0)) * 100) / 100;
};

const formatNumber = (value) => {
    const number = numberOrNull(value);

    return number === null
        ? '—'
        : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
};

const derivedField = (field, value) => ({
    ...field,
    value,
    origin: 'derived',
    origin_label: 'Calculated',
    state: 'ok',
    state_label: 'Looks good',
    tone: 'green',
    needs_review: false,
    warnings: [],
});

function ReviewSectionTitle({ icon, title, description }) {
    return (
        <div className="document-review__section-title">
            <span className="document-review__section-icon" aria-hidden="true">{icon}</span>
            <span className="document-review__section-copy">
                <Text strong className="document-review__section-name">{title}</Text>
                {description && <Text type="secondary" className="document-review__section-description">{description}</Text>}
            </span>
        </div>
    );
}

/**
 * Dedicated review workspace.
 *
 * Split out of the inbox so reviewing a document is a focused task with the
 * source available in a focused drawer while the form keeps the full workspace.
 */
export default function DocumentReviewShow({ publicId, aiReadiness = {}, documentTypes = [] }) {
    const { token } = theme.useToken();
    const screens = useBreakpoint();
    const isMobile = !screens.lg;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [document, setDocument] = useState(null);
    const [extraction, setExtraction] = useState(null);
    const [edits, setEdits] = useState({});
    const [lineEdits, setLineEdits] = useState({});
    const [readiness, setReadiness] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [matches, setMatches] = useState([]);
    const [matching, setMatching] = useState(false);
    const [proposalBusy, setProposalBusy] = useState(false);
    const [converting, setConverting] = useState(false);
    const [draftUrl, setDraftUrl] = useState(null);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('details');
    const [originalOpen, setOriginalOpen] = useState(false);

    const mountedRef = useRef(true);
    const abortRef = useRef(null);
    const pollRef = useRef(null);
    const fieldRefs = useRef({});
    const sectionRefs = useRef({});
    const detailsPaneRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            abortRef.current?.abort();
            window.clearTimeout(pollRef.current);
        };
    }, []);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const { data } = await axios.get(`/api/document-uploads/${publicId}/extraction`, {
                signal: controller.signal,
            });

            if (!mountedRef.current) return;

            setDocument(data.document);
            setExtraction(data.extraction);
            setReadiness(data.readiness || null);
            setPermissions(data.permissions || {});
            setMatches(data.matches || []);
            setError(null);
        } catch (e) {
            if (axios.isCancel?.(e) || e.name === 'CanceledError') return;
            if (!mountedRef.current) return;

            setError(e.response?.data?.message || 'This document could not be loaded.');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [publicId]);

    useEffect(() => {
        load();
    }, [load]);

    /*
     * Keep polling while the pipeline is still working, so a user who opens the
     * review screen early sees it fill in rather than an empty state.
     */
    useEffect(() => {
        const stage = extraction?.stage;
        if (!stage || stage.is_terminal) return undefined;

        pollRef.current = window.setTimeout(load, 3000);

        return () => window.clearTimeout(pollRef.current);
    }, [extraction, load]);

    /* Merge server fields with unsaved local edits. */
    const review = useMemo(() => {
        const base = extraction?.review;
        if (!base) return null;

        const fields = { ...base.fields };

        Object.entries(edits).forEach(([key, value]) => {
            if (!fields[key]) return;

            fields[key] = {
                ...fields[key],
                value,
                origin: 'user',
                origin_label: 'You entered',
                state: 'user_confirmed',
                state_label: 'You confirmed',
                tone: 'green',
                needs_review: false,
                edited_by_user: true,
                original_value: fields[key].original_value ?? fields[key].value,
            };
        });

        const lines = (base.lines || []).map((line, index) => ({
            ...line,
            ...(lineEdits[index] || {}),
        }));

        const lineArithmeticChanged = Object.values(lineEdits).some((line) => (
            ['quantity', 'rate', 'discount', 'tax_amount'].some((key) => Object.hasOwn(line, key))
        ));
        const lineTaxChanged = Object.values(lineEdits).some((line) => Object.hasOwn(line, 'tax_amount'));
        const adjustmentsChanged = Object.hasOwn(edits, 'totals.discount_total')
            || Object.hasOwn(edits, 'totals.tax_total');

        if (lineArithmeticChanged && fields['totals.subtotal']) {
            const subtotal = Math.round(lines.reduce(
                (sum, line) => sum + (calculatedLineSubtotal(line) || 0),
                0,
            ) * 100) / 100;
            fields['totals.subtotal'] = derivedField(fields['totals.subtotal'], subtotal);
        }

        if (lineTaxChanged && !Object.hasOwn(edits, 'totals.tax_total') && fields['totals.tax_total']) {
            const taxTotal = Math.round(lines.reduce(
                (sum, line) => sum + (numberOrNull(line.tax_amount ?? line.tax) || 0),
                0,
            ) * 100) / 100;
            fields['totals.tax_total'] = derivedField(fields['totals.tax_total'], taxTotal);
        }

        if ((lineArithmeticChanged || adjustmentsChanged) && fields['totals.grand_total']) {
            const subtotal = numberOrNull(fields['totals.subtotal']?.value) || 0;
            const tax = numberOrNull(fields['totals.tax_total']?.value) || 0;
            const discount = numberOrNull(fields['totals.discount_total']?.value) || 0;
            const shipping = numberOrNull(fields['totals.shipping']?.value) || 0;
            const grandTotal = Math.round((subtotal + tax - discount + shipping) * 100) / 100;

            fields['totals.grand_total'] = derivedField(fields['totals.grand_total'], grandTotal);

            if (fields['totals.balance_due']) {
                const paid = numberOrNull(fields['totals.paid_amount']?.value) || 0;
                fields['totals.balance_due'] = derivedField(
                    fields['totals.balance_due'],
                    Math.round((grandTotal - paid) * 100) / 100,
                );
            }
        }

        return { ...base, fields, lines };
    }, [extraction, edits, lineEdits]);

    const handleChange = (key, value) => setEdits((prev) => ({ ...prev, [key]: value }));
    const handleLineChange = (index, key, value) => setLineEdits((prev) => ({
        ...prev,
        [index]: { ...(prev[index] || {}), [key]: value },
    }));
    const can = (permission) => Boolean(permissions?.[permission]);
    const unsavedCount = Object.keys(edits).length
        + Object.values(lineEdits).reduce((total, line) => total + Object.keys(line).length, 0);

    const focusIssue = (issue) => {
        const node = fieldRefs.current[issue.key];
        node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node?.querySelector('input')?.focus();
    };

    const jumpToSection = (key) => {
        const node = sectionRefs.current[key];
        const pane = detailsPaneRef.current;
        setActiveSection(key);

        if (!node) return;
        if (isMobile || !pane) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const top = node.getBoundingClientRect().top
            - pane.getBoundingClientRect().top
            + pane.scrollTop
            - 78;
        pane.scrollTo({ top, behavior: 'smooth' });
    };

    const updateActiveSection = () => {
        const pane = detailsPaneRef.current;
        if (!pane) return;

        const threshold = pane.getBoundingClientRect().top + 96;
        const visible = Object.entries(sectionRefs.current)
            .filter(([, node]) => node)
            .sort(([, a], [, b]) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        const current = visible.reduce(
            (selected, [key, node]) => (node.getBoundingClientRect().top <= threshold ? key : selected),
            visible[0]?.[0] || 'details',
        );

        setActiveSection((previous) => (previous === current ? previous : current));
    };

    const save = async () => {
        if (unsavedCount === 0) {
            antMessage.info('No changes to save.');
            return true;
        }

        setSaving(true);

        try {
            await axios.patch(`/api/document-uploads/${publicId}`, {
                review_edits: edits,
                review_lines: lineEdits,
            });
            antMessage.success('Your corrections were saved.');
            setEdits({});
            setLineEdits({});
            await load();
            return true;
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Your corrections could not be saved.');
            return false;
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    const createProposal = async ({ notify = true } = {}) => {
        if (!readiness?.conversion_target || !can('document_upload.proposal.create')) return null;
        if (unsavedCount > 0 && !await save()) return null;

        setProposalBusy(true);
        try {
            const { data } = await axios.post(`/api/document-uploads/${publicId}/proposals`, {
                transaction_type: readiness.conversion_target,
            });
            if (notify) antMessage.success('Draft proposal is ready for review.');
            await load();
            return data;
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'The proposal could not be created.');
            return null;
        } finally {
            if (mountedRef.current) setProposalBusy(false);
        }
    };

    const runMatching = async () => {
        if (unsavedCount > 0 && !await save()) return;
        setMatching(true);
        try {
            const { data } = await axios.post(`/api/document-uploads/${publicId}/match-entities`);
            setMatches(data.matches || []);
            antMessage.success('Record matching completed.');
            await load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Record matching could not be completed.');
        } finally {
            if (mountedRef.current) setMatching(false);
        }
    };

    const createDraft = async (overrideDuplicate = false) => {
        const proposalData = await createProposal({ notify: false });
        const proposal = proposalData?.proposal;
        if (!proposal) return;

        setConverting(true);
        try {
            const { data } = await axios.post(
                `/api/document-uploads/${publicId}/proposals/${proposal.id}/convert`,
                { override_duplicate: overrideDuplicate },
            );
            setDraftUrl(data.open_url || null);
            antMessage.success(data.message || 'Draft transaction created.');
            await load();
            if (data.open_url) window.open(data.open_url, '_blank');
        } catch (e) {
            const response = e.response?.data;
            if (response?.code === 'DOCUMENT_DUPLICATE_DETECTED') {
                Modal.confirm({
                    title: 'Possible duplicate found',
                    content: response.message,
                    okText: 'Create draft anyway',
                    onOk: () => createDraft(true),
                });
            } else {
                antMessage.error(response?.message || 'The draft transaction could not be created.');
            }
        } finally {
            if (mountedRef.current) setConverting(false);
        }
    };

    const documentMatches = useMemo(
        () => matches.filter((match) => match.entity_type !== 'product'),
        [matches],
    );
    const lineColumns = [
        {
            title: 'Description',
            dataIndex: 'description',
            render: (value, _line, index) => (
                <Input value={value ?? ''} onChange={(event) => handleLineChange(index, 'description', event.target.value)} />
            ),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            width: 110,
            render: (value, _line, index) => (
                <InputNumber min={0} value={value} onChange={(next) => handleLineChange(index, 'quantity', next)} style={{ width: '100%' }} />
            ),
        },
        {
            title: 'Rate',
            dataIndex: 'rate',
            width: 130,
            render: (value, _line, index) => (
                <InputNumber min={0} value={value} onChange={(next) => handleLineChange(index, 'rate', next)} style={{ width: '100%' }} />
            ),
        },
        {
            title: 'Tax',
            dataIndex: 'tax_amount',
            width: 120,
            render: (value, _line, index) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={value}
                    onChange={(next) => handleLineChange(index, 'tax_amount', next)}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            width: 140,
            align: 'right',
            render: (_value, line) => (
                <Text className="document-review__readonly-amount">
                    {formatNumber(calculatedLineAmount(line))}
                </Text>
            ),
        },
    ];

    const matchColumns = [
        {
            title: 'Record type',
            dataIndex: 'entity_type',
            width: 130,
            render: (value) => humanize(value || 'record'),
        },
        { title: 'Extracted value', dataIndex: 'extracted_name' },
        {
            title: 'Match status',
            dataIndex: 'match_status',
            width: 130,
            render: (value) => (
                <Tag color={['matched', 'created', 'user_selected'].includes(value) ? 'success' : value === 'suggested' ? 'warning' : 'default'}>
                    {humanize(value || 'unmatched')}
                </Tag>
            ),
        },
        {
            title: 'Link to',
            key: 'actions',
            width: 280,
            render: (_, match) => (
                <EntityLinkSelect
                    publicId={publicId}
                    match={match}
                    type={match.entity_type}
                    canLink={can('document_upload.entity_match')}
                    canCreate={can('document_upload.create_fk')
                        && ['customer', 'supplier', 'product', 'currency', 'warehouse'].includes(match.entity_type)}
                    placeholder="Search or create"
                    onLinked={load}
                />
            ),
        },
    ];

    /* Humanised type options, with whatever the extractor returned kept in the
       list so an unexpected type is never silently dropped from the field. */
    const documentTypeOptions = useMemo(() => {
        const values = documentTypes.length ? documentTypes : FALLBACK_DOCUMENT_TYPES;
        const current = review?.fields?.document_type?.value;
        const all = current && !values.includes(current) ? [...values, current] : values;

        return all.map((value) => ({ value, label: humanize(value) }));
    }, [documentTypes, review]);

    const renderFields = (keys) => (
        <div className="document-review__field-grid">
            {keys
                .filter((key) => review?.fields?.[key])
                .map((key) => (
                    <ReviewField
                        key={key}
                        ref={(node) => {
                            fieldRefs.current[key] = node;
                        }}
                        field={review.fields[key]}
                        label={fieldLabel(key)}
                        options={key === 'document_type' ? documentTypeOptions : undefined}
                        onChange={handleChange}
                    />
                ))}
        </div>
    );

    const stillProcessing = extraction?.stage && !extraction.stage.is_terminal;
    const reviewFields = Object.values(review?.fields || {});
    const reviewIssueCount = reviewFields.filter((field) => field.needs_review).length;
    const sectionIssueCounts = {
        details: SUMMARY_FIELDS.filter((key) => review?.fields?.[key]?.needs_review).length,
        contact: PARTY_FIELDS.filter((key) => review?.fields?.[key]?.needs_review).length,
        items: reviewFields.filter((field) => field.key?.startsWith('totals.') && field.needs_review).length,
        records: 0,
    };
    const reviewSections = [
        { key: 'details', label: 'Details', icon: <FileDoneOutlined /> },
        { key: 'contact', label: 'Contact', icon: <TeamOutlined /> },
        { key: 'items', label: 'Items & totals', icon: <ShoppingCartOutlined /> },
        ...((documentMatches.length > 0 || can('document_upload.entity_match'))
            ? [{ key: 'records', label: 'Linked records', icon: <LinkOutlined /> }]
            : []),
    ];
    const topNotice = error
        ? { type: 'error', message: error }
        : extraction?.error
            ? { type: 'error', message: extraction.error.message, retry: extraction.error.actions?.includes('retry') }
            : extraction?.attempt?.partial
                ? { type: 'warning', message: 'Only part of this document could be read. Check the details carefully.' }
                : null;

    const details = (
        <div className="document-review__details-flow">
            <div className="document-review__section-nav-wrap">
                <nav className="document-review__section-nav" aria-label="Review sections">
                    {reviewSections.map((section) => {
                        const count = sectionIssueCounts[section.key] || 0;
                        const isActive = activeSection === section.key;
                        const isComplete = section.key !== 'records' || documentMatches.length > 0;

                        return (
                            <button
                                key={section.key}
                                type="button"
                                className={`document-review__section-nav-item${isActive ? ' is-active' : ''}`}
                                aria-current={isActive ? 'location' : undefined}
                                onClick={() => jumpToSection(section.key)}
                            >
                                <span className="document-review__section-nav-icon" aria-hidden="true">{section.icon}</span>
                                <span>{section.label}</span>
                                {count > 0 ? (
                                    <span className="document-review__section-nav-count">{count}</span>
                                ) : isComplete ? (
                                    <CheckCircleFilled className="document-review__section-nav-check" aria-label="Complete" />
                                ) : (
                                    <span className="document-review__section-nav-pending" aria-label="Not linked" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {review && reviewIssueCount > 0 && (
                <ReviewIssuePanel review={review} onSelectIssue={focusIssue} />
            )}

            {review && reviewIssueCount === 0 && readiness?.ready && (
                <div className="document-review__readiness is-ready">
                    <span className="document-review__readiness-icon"><CheckCircleOutlined /></span>
                    <div>
                        <Text strong>Ready to create</Text>
                        <Text type="secondary">Everything required is complete. Give the values one final check, then create the draft.</Text>
                    </div>
                </div>
            )}

            {review && reviewIssueCount === 0 && readiness && !readiness.ready && (
                <div className="document-review__readiness is-blocked">
                    <span className="document-review__readiness-icon"><WarningFilled /></span>
                    <div className="document-review__readiness-copy">
                        <Text strong>One more step before creating the draft</Text>
                        {(readiness.blockers || []).map((blocker) => {
                            const matchingSection = blocker.toLowerCase().includes('line item') ? 'items' : null;

                            return matchingSection ? (
                                <button
                                    type="button"
                                    className="document-review__blocker is-actionable"
                                    key={blocker}
                                    onClick={() => jumpToSection(matchingSection)}
                                >
                                    {blocker}
                                </button>
                            ) : (
                                <Text className="document-review__blocker" key={blocker}>{blocker}</Text>
                            );
                        })}
                    </div>
                </div>
            )}

            {review && (
                <section ref={(node) => { sectionRefs.current.details = node; }} id="review-details" className="document-review__section">
                    <Card
                        size="small"
                        title={<ReviewSectionTitle icon={<FileDoneOutlined />} title="Document details" description="Identity, dates, and currency" />}
                    >
                        {renderFields(SUMMARY_FIELDS)}
                    </Card>
                </section>
            )}

            {review && (
                <section ref={(node) => { sectionRefs.current.contact = node; }} id="review-contact" className="document-review__section">
                    <Card
                        size="small"
                        title={<ReviewSectionTitle icon={<TeamOutlined />} title="Contact and tax" description="Customer or supplier information" />}
                    >
                        {renderFields(PARTY_FIELDS)}
                    </Card>
                </section>
            )}

            {review && (
                <section ref={(node) => { sectionRefs.current.items = node; }} id="review-items" className="document-review__section">
                    <Card
                        size="small"
                        title={<ReviewSectionTitle icon={<ShoppingCartOutlined />} title="Items and totals" description={`${review.lines?.length || 0} ${review.lines?.length === 1 ? 'line item' : 'line items'}`} />}
                    >
                    {isMobile ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {(review.lines || []).map((line, index) => (
                                <Card
                                    key={line.index ?? index}
                                    size="small"
                                    title={`Item ${index + 1}`}
                                    styles={{ body: { padding: 10 } }}
                                >
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary" className="document-review__field-label">Description</Text>
                                            <Input
                                                value={line.description ?? ''}
                                                onChange={(event) => handleLineChange(index, 'description', event.target.value)}
                                            />
                                        </div>

                                        <div className="document-review__line-values">
                                            {[
                                                ['quantity', 'Quantity'],
                                                ['rate', 'Rate'],
                                                ['tax_amount', 'Tax'],
                                            ].map(([key, label]) => (
                                                <div key={key}>
                                                    <Text type="secondary" className="document-review__field-label">{label}</Text>
                                                    <InputNumber
                                                        min={0}
                                                        precision={key === 'tax_amount' ? 2 : undefined}
                                                        value={line[key]}
                                                        onChange={(value) => handleLineChange(index, key, value)}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                            ))}
                                            <div>
                                                <Text type="secondary" className="document-review__field-label">Amount</Text>
                                                <div className="document-review__readonly-amount is-mobile">
                                                    {formatNumber(calculatedLineAmount(line))}
                                                </div>
                                            </div>
                                        </div>
                                    </Space>
                                </Card>
                            ))}

                            {(review.lines || []).length === 0 && (
                                <Text type="secondary">No line items were found.</Text>
                            )}
                        </Space>
                    ) : (
                        <Table
                            size="small"
                            rowKey={(line, index) => line.index ?? index}
                            dataSource={review.lines || []}
                            columns={lineColumns}
                            pagination={false}
                            scroll={{ x: 760 }}
                            locale={{ emptyText: 'No line items were found.' }}
                        />
                    )}

                    <LineTotalsSummary
                        fields={review.fields}
                        currency={review.fields?.['currency_code']?.value || null}
                        onChange={handleChange}
                        fieldRefs={fieldRefs}
                        editableKeys={['totals.discount_total', 'totals.tax_total']}
                    />
                    </Card>
                </section>
            )}

            {review && (documentMatches.length > 0 || can('document_upload.entity_match')) && (
                <section ref={(node) => { sectionRefs.current.records = node; }} id="review-records" className="document-review__section">
                    <Card
                        size="small"
                        title={<ReviewSectionTitle icon={<LinkOutlined />} title="Linked records" description="Connect extracted values to existing records" />}
                        extra={(
                            <Button
                                size="small"
                                loading={matching}
                                disabled={!can('document_upload.entity_match')}
                                onClick={runMatching}
                            >
                                {matches.length ? 'Refresh matches' : 'Find matches'}
                            </Button>
                        )}
                    >
                    {isMobile ? (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {documentMatches.map((match) => (
                                <Card key={match.id} size="small" styles={{ body: { padding: 10 } }}>
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                        <Space wrap size={6}>
                                            <Text strong>{humanize(match.entity_type || 'record')}</Text>
                                            <Tag
                                                color={['matched', 'created', 'user_selected'].includes(match.match_status)
                                                    ? 'success'
                                                    : match.match_status === 'suggested' ? 'warning' : 'default'}
                                            >
                                                {humanize(match.match_status || 'unmatched')}
                                            </Tag>
                                        </Space>
                                        {match.extracted_name && <Text type="secondary">{match.extracted_name}</Text>}
                                        <EntityLinkSelect
                                            publicId={publicId}
                                            match={match}
                                            type={match.entity_type}
                                            canLink={can('document_upload.entity_match')}
                                            canCreate={can('document_upload.create_fk')
                                                && ['customer', 'supplier', 'product', 'currency', 'warehouse'].includes(match.entity_type)}
                                            placeholder="Search or create"
                                            onLinked={load}
                                        />
                                    </Space>
                                </Card>
                            ))}
                            {documentMatches.length === 0 && (
                                <Text type="secondary">No related records have been linked yet.</Text>
                            )}
                        </Space>
                    ) : (
                        <Table
                            size="small"
                            rowKey="id"
                            dataSource={documentMatches}
                            columns={matchColumns}
                            pagination={false}
                            scroll={{ x: 680 }}
                            locale={{ emptyText: 'No related records have been linked yet.' }}
                        />
                    )}
                    </Card>
                </section>
            )}
        </div>
    );

    async function startRescan() {
        try {
            await axios.post(`/api/document-uploads/${publicId}/scan-ai`);
            antMessage.success('Scanning again.');
            setEdits({});
            setLineEdits({});
            load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'The scan could not be started.');
        }
    }

    function rescan() {
        if (unsavedCount === 0) {
            return startRescan();
        }

        Modal.confirm({
            title: 'Discard unsaved corrections and scan again?',
            content:
                'Scanning again replaces the current extraction. Save your corrections first, or explicitly discard them to continue.',
            okText: 'Discard and rescan',
            okButtonProps: { danger: true },
            cancelText: 'Keep corrections',
            onOk: startRescan,
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Review document" />

            <div
                className="document-review"
                style={{
                    '--review-bg': token.colorBgLayout,
                    '--review-surface': token.colorBgContainer,
                    '--review-border': token.colorBorderSecondary,
                    '--review-border-strong': token.colorBorder,
                    '--review-text': token.colorText,
                    '--review-muted': token.colorTextSecondary,
                    '--review-primary': token.colorPrimary,
                    '--review-primary-bg': token.colorPrimaryBg,
                    '--review-success': token.colorSuccess,
                    '--review-success-bg': token.colorSuccessBg,
                    '--review-success-border': token.colorSuccessBorder,
                    '--review-warning': token.colorWarning,
                    '--review-warning-bg': token.colorWarningBg,
                    '--review-warning-border': token.colorWarningBorder,
                    '--review-error': token.colorError,
                }}
            >
                <style>{`
                    .document-review {
                        min-height: 100vh;
                        background: ${token.colorBgLayout};
                        padding: 0;
                    }

                    .document-review * {
                        box-sizing: border-box;
                    }

                    .document-review__shell {
                        width: 100%;
                        margin: 0;
                        overflow: hidden;
                        border: 0;
                        border-radius: 0;
                        background: ${token.colorBgContainer};
                        box-shadow: none;
                    }

                    .document-review__header {
                        position: sticky;
                        top: 0;
                        z-index: 20;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        min-height: 64px;
                        padding: 10px 12px;
                        background: ${token.colorBgContainer};
                        border-bottom: 1px solid ${token.colorBorderSecondary};
                        box-shadow: none;
                    }

                    .document-review__top-notice {
                        border: 0;
                        border-bottom: 1px solid ${token.colorBorderSecondary};
                        border-radius: 0;
                    }

                    .document-review__back {
                        flex: none;
                    }

                    .document-review__icon {
                        width: 34px;
                        height: 34px;
                        flex: none;
                        display: grid;
                        place-items: center;
                        border: 0;
                        border-radius: 0;
                        background: ${token.colorPrimaryBg};
                        box-shadow: none;
                    }

                    .document-review__heading {
                        min-width: 0;
                        flex: 1;
                    }

                    .document-review__heading-row {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        min-width: 0;
                    }

                    .document-review__title {
                        margin: 0 !important;
                        min-width: 0;
                        max-width: 720px;
                    }

                    .document-review__subtitle {
                        display: block;
                        margin-top: 2px;
                        font-size: 12px;
                        line-height: 1.45;
                    }

                    .document-review__meta {
                        margin-top: 6px;
                    }

                    .document-review__content {
                        min-width: 0;
                    }

                    .document-review__notice {
                        margin: 12px 12px 0;
                    }

                    .document-review__workspace {
                        display: grid;
                        grid-template-columns: minmax(360px, 44%) minmax(0, 56%);
                        align-items: start;
                        min-height: calc(100vh - 120px);
                    }

                    .document-review__preview-pane {
                        position: sticky;
                        top: 64px;
                        min-width: 0;
                        height: calc(100vh - 120px);
                        border-right: 1px solid ${token.colorBorderSecondary};
                        background: ${token.colorFillQuaternary};
                    }

                    .document-review__preview-pane .document-preview {
                        border: 0 !important;
                        background: transparent !important;
                    }

                    .document-review__preview-pane .document-preview__toolbar {
                        min-height: 40px;
                        padding-inline: 8px !important;
                        background: ${token.colorBgContainer};
                        border-bottom-color: ${token.colorBorderSecondary} !important;
                    }

                    .document-review__preview-pane .document-preview__toolbar .ant-typography,
                    .document-review__preview-pane .document-preview__toolbar .ant-btn {
                        color: ${token.colorTextSecondary};
                    }

                    .document-review__preview-pane .document-preview__toolbar .ant-btn:disabled {
                        color: ${token.colorTextQuaternary};
                    }

                    .document-review__preview-pane .document-preview__canvas {
                        background: ${token.colorFillQuaternary} !important;
                    }

                    .document-review__details-pane {
                        min-width: 0;
                        padding: 18px;
                        background: ${token.colorBgLayout};
                    }

                    .document-review__details-pane > .ant-space > .ant-space-item > .ant-card {
                        border-color: ${token.colorBorderSecondary};
                        border-radius: 0 !important;
                        background: ${token.colorBgContainer};
                        box-shadow: none;
                    }

                    .document-review__details-pane > .ant-space > .ant-space-item > .ant-card:hover {
                        border-color: ${token.colorBorderSecondary};
                        box-shadow: none;
                    }

                    .document-review .ant-card-head {
                        min-height: 42px;
                        padding-inline: 14px;
                        border-bottom-color: ${token.colorBorderSecondary};
                    }

                    .document-review .ant-card-head-title {
                        padding-block: 12px;
                        font-weight: 600;
                    }

                    .document-review .ant-card-body {
                        padding: 16px;
                    }

                    .document-review__section-title {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        min-width: 0;
                    }

                    .document-review__section-icon {
                        width: 32px;
                        height: 32px;
                        flex: none;
                        display: grid;
                        place-items: center;
                        border-radius: 0;
                        color: ${token.colorPrimary};
                        background: ${token.colorPrimaryBg};
                    }

                    .document-review__section-name {
                        display: block;
                        line-height: 1.35;
                    }

                    .document-review__section-name { font-size: 13px; }

                    .document-review .ant-form-item {
                        margin-bottom: 10px;
                    }

                    .document-review .ant-input,
                    .document-review .ant-input-number,
                    .document-review .ant-select-selector {
                        border-radius: 8px !important;
                    }

                    .document-review-field:hover {
                        border-color: ${token.colorBorder} !important;
                        box-shadow: none;
                    }

                    .document-review-field:focus-within {
                        border-color: ${token.colorPrimary} !important;
                        background: ${token.colorBgContainer} !important;
                        box-shadow: 0 0 0 3px ${token.colorPrimaryBg};
                    }

                    .document-review-field.is-attention:focus-within {
                        border-color: ${token.colorWarning} !important;
                        box-shadow: 0 0 0 3px ${token.colorWarningBg};
                    }

                    .document-review .ant-table-wrapper {
                        overflow: hidden;
                        border: 1px solid ${token.colorBorderSecondary};
                        border-radius: 8px;
                    }

                    .document-review .ant-table-cell {
                        padding: 8px 10px !important;
                    }

                    .document-review .ant-table-thead > tr > th {
                        font-size: 11px;
                        font-weight: 600;
                        color: ${token.colorTextSecondary};
                        background: ${token.colorFillQuaternary};
                    }

                    .document-review__field-label {
                        display: block;
                        margin-bottom: 4px;
                        font-size: 11px;
                        font-weight: 500;
                    }

                    .document-review__line-values {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 8px;
                    }

                    .document-line-totals {
                        padding-top: 4px;
                        border-top: 1px solid ${token.colorBorderSecondary};
                    }

                    .document-line-total-input input {
                        text-align: right !important;
                        font-variant-numeric: tabular-nums;
                    }

                    .document-review__footer {
                        position: sticky;
                        bottom: 0;
                        z-index: 18;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 11px 16px;
                        background: ${token.colorBgContainer};
                        border-top: 1px solid ${token.colorBorderSecondary};
                        box-shadow: 0 -8px 24px rgba(15, 23, 42, .04);
                    }

                    .document-review__footer .ant-btn { border-radius: 6px; }
                    .document-review__footer .ant-btn-primary {
                        box-shadow: none;
                    }

                    .document-review__save-state {
                        flex: 1;
                        min-width: 140px;
                        font-size: 12px;
                    }

                    .document-review__secondary-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .document-review__primary-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .document-review__mobile {
                        padding: 0 12px 12px;
                    }

                    .document-review__mobile .ant-tabs-nav {
                        position: sticky;
                        top: 68px;
                        z-index: 12;
                        margin: 0 -12px 12px;
                        padding: 0 12px;
                        background: ${token.colorBgContainer};
                    }

                    .document-review__mobile .ant-tabs-nav-list {
                        width: auto;
                        padding: 0;
                        border-radius: 0;
                        background: transparent;
                    }

                    .document-review__mobile .ant-tabs-tab {
                        flex: none;
                        margin: 0 24px 0 0 !important;
                        padding: 10px 0;
                        border-radius: 0;
                    }

                    .document-review__mobile .ant-tabs-tab-active {
                        background: transparent;
                        box-shadow: none;
                    }

                    .document-review__mobile .ant-tabs-content-holder {
                        min-width: 0;
                    }

                    @media (max-width: 1199px) {
                        .document-review {
                            padding: 0;
                        }
                    }

                    @media (max-width: 991px) {
                        .document-review__header {
                            min-height: 64px;
                            padding: 10px 12px;
                        }

                        .document-review__subtitle {
                            display: none;
                        }

                        .document-review__notice {
                            margin: 10px 10px 0;
                        }

                        .document-review__footer {
                            padding: 10px 12px;
                        }

                    }

                    @media (max-width: 767px) {
                        .document-review {
                            padding: 0;
                            background: ${token.colorBgContainer};
                        }

                        .document-review__shell {
                            border: 0;
                            border-radius: 0;
                            box-shadow: none;
                        }

                        .document-review__header {
                            gap: 8px;
                        }

                        .document-review__icon {
                            display: none;
                        }

                        .document-review__heading-row {
                            align-items: flex-start;
                        }

                        .document-review__title {
                            font-size: 16px !important;
                        }

                        .document-review__meta {
                            margin-top: 4px;
                        }

                        .document-review__mobile {
                            padding: 0 10px 10px;
                        }

                        .document-review__mobile .ant-tabs-nav {
                            top: 63px;
                            margin-inline: -10px;
                            padding-inline: 10px;
                        }

                        .document-review .ant-card-body {
                            padding: 12px;
                        }

                        .document-review__footer {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 8px;
                            padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
                        }

                        .document-review__save-state {
                            grid-column: 1 / -1;
                            min-width: 0;
                        }

                        .document-review__secondary-actions,
                        .document-review__primary-actions {
                            display: contents;
                        }

                        .document-review__footer .ant-btn,
                        .document-review__footer .ant-tooltip,
                        .document-review__footer .ant-tooltip > span,
                        .document-review__footer .ant-tooltip > span > .ant-btn {
                            width: 100%;
                        }

                        .document-review__footer .ant-btn-primary {
                            grid-column: 1 / -1;
                        }
                    }

                    @media (max-width: 480px) {
                        .document-review__back .ant-btn > span:not(.ant-btn-icon) {
                            display: none;
                        }

                        .document-review__line-values {
                            grid-template-columns: 1fr;
                        }

                        .document-review__footer {
                            grid-template-columns: 1fr;
                        }

                        .document-review__save-state,
                        .document-review__footer .ant-btn-primary {
                            grid-column: 1;
                        }
                    }
                `}</style>

                <div className="document-review__shell">
                    {topNotice && (
                        <Alert
                            className="document-review__top-notice"
                            banner
                            showIcon
                            type={topNotice.type}
                            message={topNotice.message}
                            action={topNotice.retry ? (
                                <Button size="small" icon={<ReloadOutlined />} onClick={rescan}>
                                    Retry scan
                                </Button>
                            ) : null}
                        />
                    )}

                    <header className="document-review__header">
                        <div className="document-review__back">
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => router.visit('/documents/upload')}
                                aria-label="Back to documents"
                            >
                                Documents
                            </Button>
                        </div>

                        <div className="document-review__icon" aria-hidden="true">
                            <FileTextOutlined
                                style={{
                                    fontSize: 18,
                                    color: getDocumentStatusIconColor(document?.status, token),
                                }}
                            />
                        </div>

                        <div className="document-review__heading">
                            <Text type="secondary" className="document-review__eyebrow">Document review</Text>
                            <Title level={4} className="document-review__title" ellipsis={{ tooltip: document?.label || document?.original_name }}>
                                {document?.label || document?.original_name || 'Review document'}
                            </Title>
                            <Space size={6} wrap className="document-review__meta">
                                {document && (
                                    <DocumentStatusTag
                                        status={document.status}
                                        issueCount={extraction?.attempt?.review_issue_count || 0}
                                    />
                                )}
                                {review?.document_type_label && (
                                    <Tag bordered={false}>{review.document_type_label}</Tag>
                                )}
                                {document?.original_name && document.original_name !== document.label && (
                                    <Text type="secondary" className="document-review__filename" ellipsis={{ tooltip: document.original_name }}>
                                        {document.original_name}
                                    </Text>
                                )}
                            </Space>
                        </div>

                        {!loading && review && (
                            <div className="document-review__header-actions">
                                <div className={`document-review__progress${readiness?.ready ? ' is-ready' : ''}`}>
                                    <span className="document-review__progress-icon" aria-hidden="true">
                                        {readiness?.ready ? <CheckCircleFilled /> : <WarningFilled />}
                                    </span>
                                    <span>
                                        <Text strong>{readiness?.ready ? 'Ready to create' : `${reviewIssueCount || readiness?.blockers?.length || 1} to resolve`}</Text>
                                        <Text type="secondary">{unsavedCount > 0 ? `${unsavedCount} unsaved` : 'Changes saved'}</Text>
                                    </span>
                                </div>

                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => setOriginalOpen(true)}
                                >
                                    Show original
                                </Button>
                            </div>
                        )}
                    </header>

                    <div className="document-review__content">
                        {stillProcessing && (
                            <div className="document-review__notice">
                                <Card size="small">
                                    <DocumentProcessingTimeline
                                        stage={extraction.stage}
                                        startedAt={extraction.created_at}
                                    />
                                </Card>
                            </div>
                        )}

                        {loading && (
                            <div
                                aria-label="Loading document review"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 0.8fr) minmax(420px, 1.2fr)',
                                    gap: isMobile ? 8 : 10,
                                    minHeight: 0,
                                    padding: isMobile ? 6 : 10,
                                }}
                            >
                                <div
                                    style={{
                                        padding: 10,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        background: token.colorBgContainer,
                                    }}
                                >
                                    <Skeleton.Input active block style={{ height: isMobile ? 160 : 300 }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                                        <Skeleton.Input active size="small" style={{ width: '48%' }} />
                                        <Skeleton.Button active size="small" style={{ width: 92 }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', alignContent: 'start', gap: 8 }}>
                                    {Array.from({ length: isMobile ? 1 : 2 }).map((_, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: 10,
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                background: token.colorBgContainer,
                                            }}
                                        >
                                            <Skeleton
                                                active
                                                title={{ width: index === 0 ? '34%' : '26%' }}
                                                paragraph={{ rows: 2, width: ['100%', '82%'] }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!loading && (
                            <div className={`document-review__workspace is-preview-hidden${isMobile ? ' document-review__mobile' : ''}`}>
                                <div
                                    ref={detailsPaneRef}
                                    className="document-review__details-pane"
                                    onScroll={updateActiveSection}
                                >
                                    {details}
                                </div>
                            </div>
                        )}

                        <Drawer
                            title="Original document"
                            placement="right"
                            width={isMobile ? '100%' : 760}
                            open={originalOpen}
                            onClose={() => setOriginalOpen(false)}
                            destroyOnHidden={false}
                            styles={{
                                body: {
                                    padding: 0,
                                    overflow: 'hidden',
                                    background: token.colorBgLayout,
                                },
                            }}
                        >
                            <DocumentPreview
                                document={document}
                                onDownload={(d) =>
                                    window.open(`/api/document-uploads/${d.public_id}/preview`, '_blank')
                                }
                            />
                        </Drawer>

                        {!loading && review && (
                            <div className="document-review__footer">
                                <div className={`document-review__save-state${unsavedCount > 0 ? ' has-changes' : ''}`}>
                                    {unsavedCount > 0 ? <WarningFilled /> : <CheckCircleFilled />}
                                    <Text type={unsavedCount > 0 ? undefined : 'secondary'}>
                                        {unsavedCount > 0
                                            ? `${unsavedCount} change${unsavedCount === 1 ? '' : 's'} not saved`
                                            : 'All changes saved'}
                                    </Text>
                                </div>

                                <div className="document-review__secondary-actions">
                                    <Tooltip
                                        title={
                                            aiReadiness.document_scanning_available === false
                                                ? aiReadiness.issues?.[0]?.message
                                                : null
                                        }
                                    >
                                        <span>
                                            <Button
                                                icon={<ReloadOutlined />}
                                                disabled={aiReadiness.document_scanning_available === false}
                                                onClick={rescan}
                                            >
                                                Scan again
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Button
                                        icon={<SaveOutlined />}
                                        loading={saving}
                                        disabled={unsavedCount === 0 || !can('document_upload.proposal.update')}
                                        onClick={save}
                                    >
                                        Save changes
                                    </Button>
                                </div>

                                <div className="document-review__primary-actions">
                                    {draftUrl && (
                                        <Button onClick={() => window.open(draftUrl, '_blank')}>
                                            Open draft
                                        </Button>
                                    )}

                                    <Tooltip
                                        title={!readiness?.ready ? readiness?.blockers?.[0] || 'Complete the required details first.' : null}
                                    >
                                        <span>
                                        <Button
                                            type="primary"
                                            loading={proposalBusy || converting}
                                            disabled={
                                                !readiness?.ready
                                                || stillProcessing
                                                || !can('document_upload.convert')
                                                || !can('document_upload.proposal.create')
                                            }
                                            onClick={() => createDraft(false)}
                                        >
                                            Create draft
                                        </Button>
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
