import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, router } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Col,
    Grid,
    Row,
    Skeleton,
    Space,
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
    'party.name',
];

const TOTAL_FIELDS = [
    'totals.subtotal',
    'totals.discount_total',
    'totals.tax_total',
    'totals.shipping',
    'totals.grand_total',
];

/**
 * Dedicated review workspace.
 *
 * Split out of the inbox so reviewing a document is a focused task with the
 * source visible beside the extracted values, rather than a drawer stacked on
 * top of a list.
 */
export default function DocumentReviewShow({ publicId }) {
    const { token } = theme.useToken();
    const screens = useBreakpoint();
    const isMobile = !screens.lg;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [document, setDocument] = useState(null);
    const [extraction, setExtraction] = useState(null);
    const [edits, setEdits] = useState({});
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

        return { ...base, fields };
    }, [extraction, edits]);

    const handleChange = (key, value) => setEdits((prev) => ({ ...prev, [key]: value }));

    const focusIssue = (issue) => {
        const node = fieldRefs.current[issue.key];
        node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node?.querySelector('input')?.focus();
    };

    const save = async () => {
        if (Object.keys(edits).length === 0) {
            antMessage.info('No changes to save.');
            return;
        }

        setSaving(true);

        try {
            await axios.patch(`/api/document-uploads/${publicId}`, { review_edits: edits });
            antMessage.success('Your corrections were saved.');
            setEdits({});
            load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Your corrections could not be saved.');
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

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
                <Card size="small" title="Totals">
                    {renderFields(TOTAL_FIELDS)}
                </Card>
            )}

            {review && <ConversionSummary review={review} documentType={document?.document_type} />}
        </Space>
    );

    async function rescan() {
        try {
            await axios.post(`/api/document-uploads/${publicId}/scan-ai`);
            antMessage.success('Scanning again.');
            load();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'The scan could not be started.');
        }
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
                            {Object.keys(edits).length > 0
                                ? `${Object.keys(edits).length} unsaved change(s)`
                                : 'No unsaved changes'}
                        </Text>

                        <Button icon={<ReloadOutlined />} onClick={rescan}>
                            Scan again
                        </Button>

                        <Button
                            type="primary"
                            loading={saving}
                            disabled={Object.keys(edits).length === 0}
                            onClick={save}
                        >
                            Save corrections
                        </Button>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
