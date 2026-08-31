import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    Grid,
    Input,
    InputNumber,
    Modal,
    Row,
    Skeleton,
    Space,
    Table,
    Tabs,
    Tag,
    Typography,
    message as antMessage,
    theme,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

import DocumentPreview from '../Components/DocumentPreview';
import DocumentProcessingTimeline from '../Components/DocumentProcessingTimeline';
import DocumentStatusTag from '../Components/DocumentStatusTag';
import ReviewField from '../Components/ReviewField';
import ReviewIssuePanel, { fieldLabel } from '../Components/ReviewIssuePanel';
import ConversionSummary from '../Components/ConversionSummary';

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

const PARTY_FIELDS = [
    'party.name',
    'party.email',
    'party.phone',
    'party.tax_number',
];

const TOTAL_FIELDS = [
    'totals.subtotal',
    'totals.discount_total',
    'totals.tax_total',
    'totals.shipping',
    'totals.grand_total',
    'totals.paid_amount',
    'totals.balance_due',
];

/**
 * Dedicated review workspace.
 *
 * Split out of the inbox so reviewing a document is a focused task with the
 * source visible beside the extracted values, rather than a drawer stacked on
 * top of a list.
 */
export default function DocumentReviewShow({ publicId, aiReadiness = {} }) {
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
    const [matchActionId, setMatchActionId] = useState(null);
    const [proposalBusy, setProposalBusy] = useState(false);
    const [converting, setConverting] = useState(false);
    const [draftUrl, setDraftUrl] = useState(null);
    const [error, setError] = useState(null);

    const mountedRef = useRef(true);
    const abortRef = useRef(null);
    const pollRef = useRef(null);
    const fieldRefs = useRef({});

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
            antMessage.success('ERP record matching completed.');
            await load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'ERP record matching could not be completed.');
        } finally {
            if (mountedRef.current) setMatching(false);
        }
    };

    const chooseMatch = async (match, suggestion) => {
        setMatchActionId(`${match.id}:${suggestion.id}`);
        try {
            await axios.post(`/api/document-uploads/matches/${match.id}/choose`, {
                matched_id: suggestion.id,
            });
            antMessage.success(`${suggestion.name || suggestion.code || 'Record'} linked.`);
            await load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'The selected record could not be linked.');
        } finally {
            if (mountedRef.current) setMatchActionId(null);
        }
    };

    const createMissingRecord = (match) => {
        Modal.confirm({
            title: `Create missing ${String(match.entity_type || 'record').replaceAll('_', ' ')}?`,
            content: `KiteLedger will create “${match.extracted_name}” and link it to this draft proposal. Review and approve the resulting transaction separately.`,
            okText: 'Create and link',
            onOk: async () => {
                setMatchActionId(`${match.id}:create`);
                try {
                    await axios.post(`/api/document-uploads/${publicId}/create-missing-fk`, {
                        match_id: match.id,
                        fields: { name: match.extracted_name },
                    });
                    antMessage.success('The record was created and linked.');
                    await load();
                } catch (e) {
                    antMessage.error(e.response?.data?.message || 'The missing record could not be created.');
                } finally {
                    if (mountedRef.current) setMatchActionId(null);
                }
            },
        });
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
            title: 'Amount',
            dataIndex: 'amount',
            width: 140,
            render: (value, _line, index) => (
                <InputNumber min={0} value={value} onChange={(next) => handleLineChange(index, 'amount', next)} style={{ width: '100%' }} />
            ),
        },
    ];

    const matchColumns = [
        {
            title: 'ERP record',
            dataIndex: 'entity_type',
            width: 130,
            render: (value) => String(value || 'record').replaceAll('_', ' '),
        },
        { title: 'Extracted value', dataIndex: 'extracted_name' },
        {
            title: 'Match status',
            dataIndex: 'match_status',
            width: 130,
            render: (value) => (
                <Tag color={['matched', 'created', 'user_selected'].includes(value) ? 'success' : value === 'suggested' ? 'warning' : 'default'}>
                    {String(value || 'unmatched').replaceAll('_', ' ')}
                </Tag>
            ),
        },
        {
            title: 'Review match',
            key: 'actions',
            render: (_, match) => {
                if (['matched', 'created', 'user_selected'].includes(match.match_status)) {
                    return <Text type="success">Linked{match.confidence_score ? ` · ${Math.round(match.confidence_score * 100)}%` : ''}</Text>;
                }
                const suggestions = match.options?.suggestions || [];
                const canCreate = ['customer', 'supplier', 'product', 'currency', 'warehouse'].includes(match.entity_type);
                return (
                    <Space direction="vertical" size={6}>
                        {suggestions.map((suggestion) => (
                            <Button
                                key={suggestion.id}
                                size="small"
                                loading={matchActionId === `${match.id}:${suggestion.id}`}
                                disabled={!can('document_upload.entity_match') || Boolean(matchActionId)}
                                onClick={() => chooseMatch(match, suggestion)}
                            >
                                Link {suggestion.name || suggestion.code}
                                {suggestion.reason ? ` · ${suggestion.reason}` : ''}
                            </Button>
                        ))}
                        {canCreate && (
                            <Button
                                size="small"
                                type={suggestions.length ? 'default' : 'primary'}
                                loading={matchActionId === `${match.id}:create`}
                                disabled={!can('document_upload.create_fk') || Boolean(matchActionId)}
                                onClick={() => createMissingRecord(match)}
                            >
                                Create missing record
                            </Button>
                        )}
                        {!suggestions.length && !canCreate && <Text type="secondary">Select this record in proposal review.</Text>}
                    </Space>
                );
            },
        },
    ];

    const renderFields = (keys) => (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
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
                        onChange={handleChange}
                    />
                ))}
        </Space>
    );

    const stillProcessing = extraction?.stage && !extraction.stage.is_terminal;

    const details = (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {extraction?.error && (
                <Alert
                    type="error"
                    showIcon
                    message={extraction.error.message}
                    action={
                        extraction.error.actions?.includes('retry') ? (
                            <Button size="small" icon={<ReloadOutlined />} onClick={rescan}>
                                Retry scan
                            </Button>
                        ) : null
                    }
                />
            )}

            {extraction?.attempt?.partial && (
                <Alert
                    type="warning"
                    showIcon
                    message="Only part of this document could be read. Check the details carefully."
                />
            )}

            {review && <ReviewIssuePanel review={review} onSelectIssue={focusIssue} />}

            {review && (
                <Card size="small" title="Document details">
                    {renderFields(SUMMARY_FIELDS)}
                </Card>
            )}

            {review && (
                <Card size="small" title="Supplier or customer and tax details">
                    {renderFields(PARTY_FIELDS)}
                </Card>
            )}

            {review && (
                <Card size="small" title="Totals">
                    {renderFields(TOTAL_FIELDS)}
                </Card>
            )}

            {review && (
                <Card size="small" title="Line items">
                    <Table
                        size="small"
                        rowKey={(line, index) => line.index ?? index}
                        dataSource={review.lines || []}
                        columns={lineColumns}
                        pagination={false}
                        scroll={{ x: 650 }}
                        locale={{ emptyText: 'No line items were extracted. Add them in proposal review before creating a draft.' }}
                    />
                </Card>
            )}

            {review && (
                <Card
                    size="small"
                    title="ERP record matches"
                    extra={(
                        <Button
                            size="small"
                            loading={matching}
                            disabled={!can('document_upload.entity_match')}
                            onClick={runMatching}
                        >
                            {matches.length ? 'Run matching again' : 'Match records'}
                        </Button>
                    )}
                >
                    <Table
                        size="small"
                        rowKey="id"
                        dataSource={matches}
                        columns={matchColumns}
                        pagination={false}
                        scroll={{ x: 720 }}
                        locale={{ emptyText: 'Run matching to link suppliers, customers, products, accounts, currencies, and warehouses.' }}
                    />
                </Card>
            )}

            {readiness && !readiness.ready && (
                <Alert
                    type="warning"
                    showIcon
                    message="This document cannot be converted yet"
                    description={(readiness.blockers || []).map((blocker) => <div key={blocker}>{blocker}</div>)}
                />
            )}

            {review && <ConversionSummary review={review} documentType={document?.document_type} />}
        </Space>
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
            <Head title={document?.label ? `Review ${document.label}` : 'Review document'} />

            <div style={{ padding: isMobile ? 12 : 16, background: token.colorBgLayout, minHeight: '100vh' }}>
                <Space size={12} style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.visit('/documents/upload')}
                    >
                        Documents
                    </Button>

                    <div style={{ minWidth: 0 }}>
                        <Title level={4} style={{ margin: 0 }} ellipsis>
                            {document?.label || document?.original_file_name || 'Document'}
                        </Title>
                        <Space size={8} wrap>
                            {document && (
                                <DocumentStatusTag
                                    status={document.status}
                                    issueCount={extraction?.attempt?.review_issue_count || 0}
                                />
                            )}
                            {review?.document_type_label && (
                                <Tag bordered={false}>{review.document_type_label}</Tag>
                            )}
                        </Space>
                    </div>
                </Space>

                {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

                {stillProcessing && (
                    <Card size="small" style={{ marginBottom: 16 }}>
                        <DocumentProcessingTimeline
                            stage={extraction.stage}
                            startedAt={extraction.created_at}
                        />
                    </Card>
                )}

                {loading && <Skeleton active paragraph={{ rows: 8 }} />}

                {!loading && isMobile && (
                    <Tabs
                        items={[
                            { key: 'review', label: 'Extracted information', children: details },
                            {
                                key: 'document',
                                label: 'Document',
                                children: (
                                    <DocumentPreview
                                        document={document}
                                        onDownload={(d) =>
                                            window.open(`/api/document-uploads/${d.public_id}/preview`, '_blank')
                                        }
                                    />
                                ),
                            },
                        ]}
                    />
                )}

                {!loading && !isMobile && (
                    <Row gutter={16}>
                        <Col span={11}>
                            <div style={{ position: 'sticky', top: 16, height: 'calc(100vh - 180px)' }}>
                                <DocumentPreview
                                    document={document}
                                    onDownload={(d) =>
                                        window.open(`/api/document-uploads/${d.public_id}/preview`, '_blank')
                                    }
                                />
                            </div>
                        </Col>
                        <Col span={13}>{details}</Col>
                    </Row>
                )}

                {/* Sticky footer keeps the primary action reachable however long
                    the review gets. */}
                {!loading && review && (
                    <div
                        style={{
                            position: 'sticky',
                            bottom: 0,
                            marginTop: 16,
                            padding: 12,
                            background: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Text type="secondary" style={{ flex: 1, fontSize: 12, alignSelf: 'center' }}>
                            {unsavedCount > 0
                                ? `${unsavedCount} unsaved change(s)`
                                : 'No unsaved changes'}
                        </Text>

                        <Tooltip title={aiReadiness.document_scanning_available === false ? aiReadiness.issues?.[0]?.message : null}>
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
                            type="primary"
                            loading={saving}
                            disabled={unsavedCount === 0 || !can('document_upload.proposal.update')}
                            onClick={save}
                        >
                            Save corrections
                        </Button>

                        <Button
                            loading={proposalBusy}
                            disabled={!readiness?.conversion_target || !can('document_upload.proposal.create')}
                            onClick={() => createProposal()}
                        >
                            Create or update proposal
                        </Button>

                        {readiness?.ready && (
                            <Button
                                type="primary"
                                loading={converting}
                                disabled={!can('document_upload.convert') || !can('document_upload.proposal.create')}
                                onClick={() => createDraft(false)}
                            >
                                Create draft transaction
                            </Button>
                        )}

                        {draftUrl && (
                            <Button type="link" onClick={() => window.open(draftUrl, '_blank')}>
                                Open created draft
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
