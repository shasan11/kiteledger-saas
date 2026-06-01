import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
    message as antMessage,
    theme,
} from 'antd';
import {
    InboxOutlined,
    EyeOutlined,
    ScanOutlined,
    SearchOutlined,
    ToolOutlined,
    SwapOutlined,
    DeleteOutlined,
    ReloadOutlined,
    FileTextOutlined,
    PlusOutlined,
    EditOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const STATUS_COLORS = {
    uploaded: 'default',
    processing: 'processing',
    extracted: 'cyan',
    needs_review: 'gold',
    converted: 'green',
    failed: 'red',
    archived: 'default',
};

function hasPerm(perms, key) {
    return !!(perms && perms[key]);
}

function humanize(value) {
    if (value === null || value === undefined || value === '') return '—';

    return String(value)
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldHumanizeString(value) {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();

    if (!trimmed) return false;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false;
    if (trimmed.includes('@')) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
    if (/^[A-Z]{3}$/.test(trimmed)) return false;

    return /[_-]/.test(trimmed);
}

function readableValue(value) {
    if (value === null || value === undefined || value === '') return '—';

    if (shouldHumanizeString(value)) {
        return humanize(value);
    }

    return value;
}

function humanizeData(value) {
    if (Array.isArray(value)) {
        return value.map((item) => humanizeData(item));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => [humanize(key), humanizeData(val)]),
        );
    }

    return readableValue(value);
}

function toOptions(items = []) {
    return items.map((item) => {
        if (typeof item === 'string') {
            return {
                value: item,
                label: humanize(item),
            };
        }

        return {
            ...item,
            label: humanize(item.label || item.value),
        };
    });
}

function formatList(items = []) {
    return items.map((item) => humanize(item)).join(', ');
}

export default function DocumentUploadIndex() {
    const { token } = theme.useToken();
    const { props } = usePage();

    const config = props.config || {};
    const permissions = props.permissions || {};

    const [documents, setDocuments] = useState({ data: [], total: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState();
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

    const [convertDoc, setConvertDoc] = useState(null);
    const [convertType, setConvertType] = useState('purchase_bill');
    const [convertProposal, setConvertProposal] = useState(null);
    const [converting, setConverting] = useState(false);

    const [matchDoc, setMatchDoc] = useState(null);
    const [matchData, setMatchData] = useState([]);
    const [matchLoading, setMatchLoading] = useState(false);

    const transactionTypes = config.transaction_types || [];
    const documentTypes = config.document_types || [];

    const transactionTypeOptions = useMemo(() => toOptions(transactionTypes), [transactionTypes]);
    const documentTypeOptions = useMemo(() => toOptions(documentTypes), [documentTypes]);

    const styles = useMemo(
        () => ({
            page: {
                padding: 16,
                minHeight: '100%',
                background: token.colorBgLayout,
            },
            header: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 12,
            },
            title: {
                margin: 0,
                color: token.colorText,
            },
            subtitle: {
                marginBottom: 0,
                color: token.colorTextSecondary,
            },
            card: {
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
                borderColor: token.colorBorderSecondary,
            },
            toolbar: {
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
            },
            modalScroll: {
                maxHeight: '72vh',
                overflow: 'auto',
                paddingRight: 4,
            },
            iframe: {
                width: '100%',
                height: '72vh',
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
            },
            codeBlock: {
                maxHeight: 360,
                overflow: 'auto',
                background: token.colorFillAlter,
                color: token.colorText,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                padding: 12,
                margin: 0,
                fontSize: 12,
                lineHeight: 1.6,
            },
            smallCodeBlock: {
                overflow: 'auto',
                background: token.colorFillAlter,
                color: token.colorText,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                padding: 10,
                margin: 0,
                fontSize: 12,
                lineHeight: 1.6,
            },
        }),
        [token],
    );

    const fetchDocs = async (overrides = {}) => {
        const nextPage = overrides.page ?? page;
        const nextPageSize = overrides.pageSize ?? pageSize;

        setLoading(true);

        try {
            const { data } = await axios.get('/api/document-uploads', {
                params: {
                    search: search || undefined,
                    status: statusFilter || undefined,
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
    }, [page, pageSize, statusFilter]);

    const resetUploadModal = () => {
        uploadForm.resetFields();
        setFileList([]);
    };

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

        if (values.document_type) {
            formData.append('document_type', values.document_type);
        }

        if (values.notes) {
            formData.append('notes', values.notes);
        }

        setUploading(true);

        try {
            await axios.post('/api/document-uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            antMessage.success('Document uploaded.');
            setUploadOpen(false);
            resetUploadModal();
            fetchDocs();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
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
            await axios.put(`/api/document-uploads/${editDoc.id}`, values);

            antMessage.success('Document updated.');
            setEditOpen(false);
            setEditDoc(null);
            editForm.resetFields();
            fetchDocs();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Update failed');
        } finally {
            setSavingEdit(false);
        }
    };

    const scanDoc = async (doc) => {
        try {
            const { data } = await axios.post(`/api/document-uploads/${doc.id}/scan-ai`, { sync: true });

            antMessage.success(data.message || 'Scan completed.');
            fetchDocs();
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Scan failed');
        }
    };

    const openExtraction = async (doc) => {
        setExtractDoc(doc);
        setExtractData(null);
        setExtractLoading(true);

        try {
            const { data } = await axios.get(`/api/document-uploads/${doc.id}/extraction`);

            setExtractData(data);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Failed to load extraction');
        } finally {
            setExtractLoading(false);
        }
    };

    const openMatch = async (doc) => {
        setMatchDoc(doc);
        setMatchData([]);
        setMatchLoading(true);

        try {
            const { data } = await axios.post(`/api/document-uploads/${doc.id}/match-entities`);

            setMatchData(data.matches || []);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Match failed');
        } finally {
            setMatchLoading(false);
        }
    };

    const openConvert = async (doc) => {
        setConvertDoc(doc);
        setConvertProposal(null);
        setConvertType('purchase_bill');
    };

    const createProposal = async () => {
        if (!convertDoc) return;

        try {
            const { data } = await axios.post(`/api/document-uploads/${convertDoc.id}/proposals`, {
                transaction_type: convertType,
            });

            setConvertProposal(data.proposal);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Could not create proposal');
        }
    };

    const convert = async (overrideDuplicate = false) => {
        if (!convertDoc || !convertProposal) return;

        setConverting(true);

        try {
            const { data } = await axios.post(
                `/api/document-uploads/${convertDoc.id}/proposals/${convertProposal.id}/convert`,
                { override_duplicate: overrideDuplicate },
            );

            antMessage.success(data.message || 'Draft created.');
            setConvertDoc(null);
            setConvertProposal(null);
            fetchDocs();

            if (data.open_url) {
                window.open(data.open_url, '_blank');
            }
        } catch (e) {
            const resp = e.response?.data;

            if (resp?.code === 'DOCUMENT_DUPLICATE_DETECTED') {
                Modal.confirm({
                    title: 'Possible duplicate found',
                    content: (
                        <div>
                            <Paragraph>{resp.message}</Paragraph>
                            <ul>
                                {(resp.duplicates || []).map((duplicate, index) => (
                                    <li key={index}>
                                        {humanize(duplicate.reason)}{' '}
                                        {duplicate.open_url && (
                                            <a href={duplicate.open_url} target="_blank" rel="noreferrer">
                                                Open existing
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ),
                    okText: 'Proceed Anyway',
                    cancelText: 'Cancel',
                    onOk: () => convert(true),
                });
            } else {
                antMessage.error(resp?.message || 'Convert failed');
            }
        } finally {
            setConverting(false);
        }
    };

    const deleteDoc = async (doc) => {
        Modal.confirm({
            title: 'Delete document?',
            content: doc.label || 'Untitled Document',
            okType: 'danger',
            okText: 'Delete',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await axios.delete(`/api/document-uploads/${doc.id}`);

                    antMessage.success('Document removed.');
                    fetchDocs();
                } catch (e) {
                    antMessage.error(e.response?.data?.message || 'Delete failed');
                }
            },
        });
    };

    const canUpdate =
        hasPerm(permissions, 'document_upload.update') ||
        hasPerm(permissions, 'document_upload.edit');

    const columns = useMemo(
        () => [
            {
                title: 'Document',
                dataIndex: 'label',
                key: 'label',
                render: (value) => (
                    <Text strong>{value || 'Untitled Document'}</Text>
                ),
            },
            {
                title: 'Type',
                dataIndex: 'document_type',
                key: 'document_type',
                width: 150,
                render: (value) => <Tag>{humanize(value || 'unknown')}</Tag>,
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 150,
                render: (value) => (
                    <Tag color={STATUS_COLORS[value] || 'default'}>
                        {humanize(value)}
                    </Tag>
                ),
            },
            {
                title: 'Confidence',
                key: 'confidence',
                width: 120,
                render: (_, record) =>
                    record.extraction?.confidence_score
                        ? `${Math.round(record.extraction.confidence_score * 100)}%`
                        : '—',
            },
            {
                title: 'Uploaded By',
                key: 'uploaded_by',
                width: 160,
                render: (_, record) => record.uploader?.name || '—',
            },
            {
                title: 'Uploaded At',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 180,
                render: (value) => (value ? new Date(value).toLocaleString() : '—'),
            },
            {
                title: 'Actions',
                key: 'actions',
                fixed: 'right',
                width: 270,
                render: (_, record) => (
                    <Space size={4} wrap>
                        <Tooltip title="Preview">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => setPreviewDoc(record)}
                            />
                        </Tooltip>

                        {canUpdate && (
                            <Tooltip title="Edit">
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => openEdit(record)}
                                />
                            </Tooltip>
                        )}

                        {['uploaded', 'failed', 'needs_review', 'extracted'].includes(record.status) &&
                            hasPerm(permissions, 'document_upload.scan_ai') && (
                                <Tooltip title="Scan with AI">
                                    <Button
                                        size="small"
                                        icon={<ScanOutlined />}
                                        onClick={() => scanDoc(record)}
                                    />
                                </Tooltip>
                            )}

                        {record.extraction && hasPerm(permissions, 'document_upload.extract.view') && (
                            <Tooltip title="View Extracted Data">
                                <Button
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    onClick={() => openExtraction(record)}
                                />
                            </Tooltip>
                        )}

                        {record.extraction && hasPerm(permissions, 'document_upload.entity_match') && (
                            <Tooltip title="Match Entities">
                                <Button
                                    size="small"
                                    icon={<ToolOutlined />}
                                    onClick={() => openMatch(record)}
                                />
                            </Tooltip>
                        )}

                        {record.extraction &&
                            hasPerm(permissions, 'document_upload.convert') &&
                            record.status !== 'converted' && (
                                <Tooltip title="Create Transaction">
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<SwapOutlined />}
                                        onClick={() => openConvert(record)}
                                    />
                                </Tooltip>
                            )}

                        {hasPerm(permissions, 'document_upload.delete') && (
                            <Tooltip title="Delete">
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => deleteDoc(record)}
                                />
                            </Tooltip>
                        )}
                    </Space>
                ),
            },
        ],
        [permissions, canUpdate],
    );

    return (
        <AuthenticatedLayout>
            <Head title="Document Upload" />

            <div style={styles.page}>
                <div style={styles.header}>
                    <div>
                        <Title level={3} style={styles.title}>
                            Document Upload
                        </Title>

                        <Paragraph style={styles.subtitle}>
                            Upload business documents, review extracted details, and create draft transactions.
                        </Paragraph>
                    </div>

                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled={!hasPerm(permissions, 'document_upload.create')}
                        onClick={() => setUploadOpen(true)}
                    >
                        Upload Document
                    </Button>
                </div>

                <Card
                    size="small"
                    title="Uploaded Documents"
                    style={styles.card}
                    extra={
                        <div style={styles.toolbar}>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Search document"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onPressEnter={() => {
                                    setPage(1);
                                    fetchDocs({ page: 1 });
                                }}
                                style={{ width: 260 }}
                            />

                            <Select
                                allowClear
                                placeholder="Status"
                                style={{ width: 170 }}
                                value={statusFilter}
                                onChange={(value) => {
                                    setStatusFilter(value);
                                    setPage(1);
                                }}
                                options={Object.keys(STATUS_COLORS).map((status) => ({
                                    value: status,
                                    label: humanize(status),
                                }))}
                            />

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => fetchDocs({ page })}
                            />
                        </div>
                    }
                >
                    <Table
                        size="small"
                        rowKey="id"
                        loading={loading}
                        dataSource={documents.data || []}
                        columns={columns}
                        scroll={{ x: 1100 }}
                        pagination={{
                            current: page,
                            pageSize,
                            total: documents.total || 0,
                            showSizeChanger: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                            onChange: (nextPage, nextPageSize) => {
                                setPage(nextPage);
                                setPageSize(nextPageSize);
                            },
                        }}
                    />
                </Card>

                <Modal
                    title="Upload Document"
                    open={uploadOpen}
                    width={720}
                    okText="Upload"
                    confirmLoading={uploading}
                    onOk={handleUpload}
                    onCancel={() => {
                        setUploadOpen(false);
                        resetUploadModal();
                    }}
                    destroyOnClose
                >
                    <Form
                        form={uploadForm}
                        layout="vertical"
                        initialValues={{ document_type: 'unknown' }}
                    >
                        <Form.Item
                            label="Label"
                            name="label"
                            rules={[{ required: true, message: 'Label is required' }]}
                        >
                            <Input placeholder="e.g. October supplier bill from Acme" />
                        </Form.Item>

                        <Form.Item label="Document Type" name="document_type">
                            <Select options={documentTypeOptions} />
                        </Form.Item>

                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} placeholder="Optional internal note" />
                        </Form.Item>

                        <Form.Item label={`File (max ${config.max_upload_mb || 10} MB)`} required>
                            <Dragger
                                multiple={false}
                                beforeUpload={() => false}
                                fileList={fileList}
                                onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p>Click or drag file here</p>
                                <p className="ant-upload-hint">PDF, JPG, PNG, WEBP</p>
                            </Dragger>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Edit Document${editDoc?.label ? ` — ${editDoc.label}` : ''}`}
                    open={editOpen}
                    width={640}
                    okText="Save Changes"
                    confirmLoading={savingEdit}
                    onOk={handleUpdate}
                    onCancel={() => {
                        setEditOpen(false);
                        setEditDoc(null);
                        editForm.resetFields();
                    }}
                    destroyOnClose
                >
                    <Form form={editForm} layout="vertical">
                        <Form.Item
                            label="Label"
                            name="label"
                            rules={[{ required: true, message: 'Label is required' }]}
                        >
                            <Input placeholder="Document label" />
                        </Form.Item>

                        <Form.Item label="Document Type" name="document_type">
                            <Select options={documentTypeOptions} />
                        </Form.Item>

                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} placeholder="Optional internal note" />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={previewDoc?.label || 'Preview'}
                    open={!!previewDoc}
                    width={960}
                    footer={null}
                    onCancel={() => setPreviewDoc(null)}
                    destroyOnClose
                >
                    {previewDoc && (
                        <iframe
                            src={`/api/document-uploads/${previewDoc.id}/preview`}
                            style={styles.iframe}
                            title={previewDoc.label || 'Document Preview'}
                        />
                    )}
                </Modal>

                <Modal
                    title={`Extracted Data${extractDoc?.label ? ` — ${extractDoc.label}` : ''}`}
                    open={!!extractDoc}
                    width={1040}
                    footer={[
                        <Button
                            key="close"
                            onClick={() => {
                                setExtractDoc(null);
                                setExtractData(null);
                            }}
                        >
                            Close
                        </Button>,
                    ]}
                    onCancel={() => {
                        setExtractDoc(null);
                        setExtractData(null);
                    }}
                    destroyOnClose
                >
                    <div style={styles.modalScroll}>
                        {extractLoading ? (
                            <Card loading size="small" />
                        ) : (
                            extractData && <ExtractionView data={extractData} styles={styles} />
                        )}
                    </div>
                </Modal>

                <Modal
                    title={`Entity Matches${matchDoc?.label ? ` — ${matchDoc.label}` : ''}`}
                    open={!!matchDoc}
                    width={820}
                    footer={[
                        <Button key="close" onClick={() => setMatchDoc(null)}>
                            Close
                        </Button>,
                    ]}
                    onCancel={() => setMatchDoc(null)}
                    destroyOnClose
                >
                    <div style={styles.modalScroll}>
                        {matchLoading ? (
                            <Card loading size="small" />
                        ) : (
                            <MatchList matches={matchData} />
                        )}
                    </div>
                </Modal>

                <Modal
                    title={`Create Transaction${convertDoc?.label ? ` — ${convertDoc.label}` : ''}`}
                    open={!!convertDoc}
                    width={860}
                    footer={null}
                    onCancel={() => {
                        setConvertDoc(null);
                        setConvertProposal(null);
                    }}
                    destroyOnClose
                >
                    <div style={styles.modalScroll}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div>
                                <Text strong>Target Transaction</Text>

                                <Select
                                    value={convertType}
                                    onChange={setConvertType}
                                    style={{ width: '100%', marginTop: 6 }}
                                    options={transactionTypeOptions}
                                />
                            </div>

                            <Button onClick={createProposal}>
                                Build Proposal
                            </Button>

                            {convertProposal && (
                                <Card size="small" title="Proposal Details" style={styles.card}>
                                    {convertProposal.missing_fields?.length > 0 && (
                                        <Alert
                                            type="warning"
                                            message="Missing Fields"
                                            description={formatList(convertProposal.missing_fields)}
                                            style={{ marginBottom: 8 }}
                                        />
                                    )}

                                    {convertProposal.warnings?.length > 0 && (
                                        <Alert
                                            type="info"
                                            message="Warnings"
                                            description={formatList(convertProposal.warnings)}
                                            style={{ marginBottom: 8 }}
                                        />
                                    )}

                                    <pre style={styles.codeBlock}>
                                        {JSON.stringify(humanizeData(convertProposal.payload), null, 2)}
                                    </pre>

                                    <Space style={{ marginTop: 12 }}>
                                        <Button
                                            type="primary"
                                            loading={converting}
                                            disabled={
                                                convertProposal.status === 'needs_review' ||
                                                !hasPerm(permissions, 'document_upload.convert')
                                            }
                                            onClick={() => convert(false)}
                                        >
                                            Create Draft
                                        </Button>

                                        <Tag color={convertProposal.status === 'ready' ? 'green' : 'gold'}>
                                            {humanize(convertProposal.status)}
                                        </Tag>
                                    </Space>
                                </Card>
                            )}
                        </Space>
                    </div>
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}

function ExtractionView({ data, styles }) {
    const extraction = data.extraction;
    const normalized = extraction?.normalized_json || {};

    if (!extraction) {
        return <Alert type="info" message="No extraction yet." />;
    }

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
                <Tag color="blue">{humanize(normalized.document_type || 'unknown')}</Tag>

                {typeof normalized.confidence === 'number' && (
                    <Tag>Confidence: {Math.round(normalized.confidence * 100)}%</Tag>
                )}

                <Tag>Status: {humanize(extraction.status)}</Tag>
            </Space>

            {normalized.warnings?.length > 0 && (
                <Alert
                    type="warning"
                    message="Warnings"
                    description={formatList(normalized.warnings)}
                />
            )}

            {normalized.missing_fields?.length > 0 && (
                <Alert
                    type="info"
                    message="Missing Fields"
                    description={formatList(normalized.missing_fields)}
                />
            )}

            <Card size="small" title="Party" style={styles.card}>
                <pre style={styles.smallCodeBlock}>
                    {JSON.stringify(humanizeData(normalized.party), null, 2)}
                </pre>
            </Card>

            <Card size="small" title="Document Details" style={styles.card}>
                <Space direction="vertical" size={2}>
                    <Text>Number: {normalized.document_number || '—'}</Text>
                    <Text>Date: {normalized.document_date || '—'}</Text>
                    <Text>Due Date: {normalized.due_date || '—'}</Text>
                    <Text>Currency: {normalized.currency_code || '—'}</Text>
                </Space>
            </Card>

            <Card size="small" title="Lines" style={styles.card}>
                <Table
                    size="small"
                    pagination={false}
                    rowKey={(record, index) => index}
                    dataSource={normalized.lines || []}
                    scroll={{ x: 700 }}
                    columns={[
                        {
                            title: 'Description',
                            dataIndex: 'description',
                            render: (value) => readableValue(value),
                        },
                        {
                            title: 'Qty',
                            dataIndex: 'quantity',
                            width: 90,
                        },
                        {
                            title: 'Rate',
                            dataIndex: 'rate',
                            width: 100,
                        },
                        {
                            title: 'Tax',
                            dataIndex: 'tax_amount',
                            width: 100,
                        },
                        {
                            title: 'Amount',
                            dataIndex: 'amount',
                            width: 120,
                        },
                    ]}
                />
            </Card>

            <Card size="small" title="Totals" style={styles.card}>
                <pre style={styles.smallCodeBlock}>
                    {JSON.stringify(humanizeData(normalized.totals), null, 2)}
                </pre>
            </Card>

            {normalized.payment && (
                <Card size="small" title="Payment" style={styles.card}>
                    <pre style={styles.smallCodeBlock}>
                        {JSON.stringify(humanizeData(normalized.payment), null, 2)}
                    </pre>
                </Card>
            )}
        </Space>
    );
}

function MatchList({ matches }) {
    if (!matches?.length) {
        return <Alert type="info" message="No matches yet. Run AI scan to extract entities." />;
    }

    return (
        <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={matches}
            scroll={{ x: 700 }}
            columns={[
                {
                    title: 'Type',
                    dataIndex: 'entity_type',
                    width: 140,
                    render: (value) => humanize(value),
                },
                {
                    title: 'Extracted Name',
                    dataIndex: 'extracted_name',
                    render: (value) => readableValue(value),
                },
                {
                    title: 'Status',
                    dataIndex: 'match_status',
                    width: 140,
                    render: (value) => (
                        <Tag
                            color={
                                value === 'matched' || value === 'created'
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
                    title: 'Matched ID',
                    dataIndex: 'matched_id',
                    width: 120,
                    render: (value) => value || '—',
                },
            ]}
        />
    );
}