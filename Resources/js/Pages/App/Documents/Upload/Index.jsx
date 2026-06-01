import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { Head, usePage } from '@inertiajs/react';
import {
    Alert,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
    message as antMessage,
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
    archived: 'silver',
};

function hasPerm(perms, key) {
    return !!(perms && perms[key]);
}

export default function DocumentUploadIndex() {
    const { props } = usePage();
    const config = props.config || {};
    const permissions = props.permissions || {};

    const [documents, setDocuments] = useState({ data: [], total: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [uploadForm] = Form.useForm();

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

    const transactionTypes = config.transaction_types || [];
    const documentTypes = config.document_types || [];

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/document-uploads', {
                params: {
                    search: search || undefined,
                    status: statusFilter || undefined,
                    page,
                    per_page: pageSize,
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

    const handleUpload = async () => {
        const values = await uploadForm.validateFields();
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
        setExtractLoading(true);
        try {
            const { data } = await axios.get(`/api/document-uploads/${doc.id}/extraction`);
            setExtractData(data);
        } catch (e) {
            antMessage.error('Failed to load extraction');
        } finally {
            setExtractLoading(false);
        }
    };

    const openMatch = async (doc) => {
        setMatchDoc(doc);
        try {
            const { data } = await axios.post(`/api/document-uploads/${doc.id}/match-entities`);
            setMatchData(data.matches || []);
        } catch (e) {
            antMessage.error(e.response?.data?.message || 'Match failed');
        }
    };

    const openConvert = async (doc) => {
        setConvertDoc(doc);
        setConvertProposal(null);
        setConvertType('purchase_bill');
    };

    const createProposal = async () => {
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
        if (!convertProposal) return;
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
            if (data.open_url) window.open(data.open_url, '_blank');
        } catch (e) {
            const resp = e.response?.data;
            if (resp?.code === 'DOCUMENT_DUPLICATE_DETECTED') {
                Modal.confirm({
                    title: 'Possible duplicate found',
                    content: (
                        <div>
                            <Paragraph>{resp.message}</Paragraph>
                            <ul>
                                {(resp.duplicates || []).map((d, i) => (
                                    <li key={i}>
                                        {d.reason}{' '}
                                        {d.open_url && (
                                            <a href={d.open_url} target="_blank" rel="noreferrer">
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
            content: doc.label,
            okType: 'danger',
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

    const columns = useMemo(
        () => [
            { title: 'Label', dataIndex: 'label', key: 'label', render: (v, r) => <Space direction="vertical" size={0}><Text strong>{v}</Text><Text type="secondary" style={{ fontSize: 12 }}>{r.original_file_name}</Text></Space> },
            { title: 'Type', dataIndex: 'document_type', key: 'document_type', render: (v) => <Tag>{v}</Tag> },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
            { title: 'Confidence', key: 'confidence', render: (_, r) => r.extraction?.confidence_score ? `${Math.round(r.extraction.confidence_score * 100)}%` : '—' },
            { title: 'Uploaded By', key: 'uploaded_by', render: (_, r) => r.uploader?.name || '—' },
            { title: 'Uploaded At', dataIndex: 'created_at', key: 'created_at', render: (v) => v ? new Date(v).toLocaleString() : '—' },
            {
                title: 'Actions',
                key: 'actions',
                fixed: 'right',
                render: (_, r) => (
                    <Space size={4} wrap>
                        <Tooltip title="Preview">
                            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewDoc(r)} />
                        </Tooltip>
                        {['uploaded', 'failed', 'needs_review', 'extracted'].includes(r.status) && hasPerm(permissions, 'document_upload.scan_ai') && (
                            <Tooltip title="Scan with AI">
                                <Button size="small" icon={<ScanOutlined />} onClick={() => scanDoc(r)} />
                            </Tooltip>
                        )}
                        {r.extraction && hasPerm(permissions, 'document_upload.extract.view') && (
                            <Tooltip title="View Extracted Data">
                                <Button size="small" icon={<FileTextOutlined />} onClick={() => openExtraction(r)} />
                            </Tooltip>
                        )}
                        {r.extraction && hasPerm(permissions, 'document_upload.entity_match') && (
                            <Tooltip title="Match Entities">
                                <Button size="small" icon={<ToolOutlined />} onClick={() => openMatch(r)} />
                            </Tooltip>
                        )}
                        {r.extraction && hasPerm(permissions, 'document_upload.convert') && r.status !== 'converted' && (
                            <Tooltip title="Create Transaction">
                                <Button size="small" type="primary" icon={<SwapOutlined />} onClick={() => openConvert(r)} />
                            </Tooltip>
                        )}
                        {hasPerm(permissions, 'document_upload.delete') && (
                            <Tooltip title="Delete">
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteDoc(r)} />
                            </Tooltip>
                        )}
                    </Space>
                ),
            },
        ],
        [permissions],
    );

    return (
        <AuthenticatedLayout>
            <Head title="Document Upload" />
            <div style={{ padding: 16 }}>
                <Title level={3} style={{ marginTop: 0 }}>Document Upload</Title>
                <Paragraph type="secondary">Upload business documents and convert them into draft transactions with AI assistance.</Paragraph>

                <Card title="Upload Document" style={{ marginBottom: 16 }}>
                    <Form form={uploadForm} layout="vertical" initialValues={{ document_type: 'unknown' }}>
                        <Form.Item label="Label" name="label" rules={[{ required: true, message: 'Label is required' }]}>
                            <Input placeholder="e.g. October supplier bill from Acme" />
                        </Form.Item>
                        <Form.Item label="Document Type" name="document_type">
                            <Select options={documentTypes.map((t) => ({ value: t, label: t }))} />
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item label={`File (max ${config.max_upload_mb || 10} MB)`} required>
                            <Dragger
                                multiple={false}
                                beforeUpload={() => false}
                                fileList={fileList}
                                onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                            >
                                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                <p>Click or drag file here</p>
                                <p className="ant-upload-hint">PDF, JPG, PNG, WEBP</p>
                            </Dragger>
                        </Form.Item>
                        <Button type="primary" loading={uploading} onClick={handleUpload} disabled={!hasPerm(permissions, 'document_upload.create')}>
                            Upload
                        </Button>
                    </Form>
                </Card>

                <Card
                    title="Uploaded Documents"
                    extra={
                        <Space>
                            <Input
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Search label or filename"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onPressEnter={() => { setPage(1); fetchDocs(); }}
                                style={{ width: 240 }}
                            />
                            <Select
                                allowClear
                                placeholder="Status"
                                style={{ width: 160 }}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))}
                            />
                            <Button icon={<ReloadOutlined />} onClick={fetchDocs} />
                        </Space>
                    }
                >
                    <Table
                        rowKey="id"
                        loading={loading}
                        dataSource={documents.data || []}
                        columns={columns}
                        scroll={{ x: 1000 }}
                        pagination={{
                            current: page,
                            pageSize,
                            total: documents.total || 0,
                            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                        }}
                    />
                </Card>

                {/* Preview Drawer */}
                <Drawer
                    title={previewDoc?.label}
                    width={720}
                    open={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                >
                    {previewDoc && (
                        <iframe
                            src={`/api/document-uploads/${previewDoc.id}/preview`}
                            style={{ width: '100%', height: '85vh', border: 0 }}
                            title={previewDoc.label}
                        />
                    )}
                </Drawer>

                {/* Extraction Drawer */}
                <Drawer
                    title={`Extracted Data — ${extractDoc?.label || ''}`}
                    width={900}
                    open={!!extractDoc}
                    onClose={() => { setExtractDoc(null); setExtractData(null); }}
                    loading={extractLoading}
                >
                    {extractData && (
                        <ExtractionView data={extractData} />
                    )}
                </Drawer>

                {/* Match Drawer */}
                <Drawer
                    title={`FK Matches — ${matchDoc?.label || ''}`}
                    width={700}
                    open={!!matchDoc}
                    onClose={() => setMatchDoc(null)}
                >
                    <MatchList matches={matchData} docId={matchDoc?.id} onChanged={(updated) => setMatchData(updated)} />
                </Drawer>

                {/* Convert Drawer */}
                <Drawer
                    title={`Create Transaction — ${convertDoc?.label || ''}`}
                    width={760}
                    open={!!convertDoc}
                    onClose={() => { setConvertDoc(null); setConvertProposal(null); }}
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div>
                            <Text strong>Target transaction</Text>
                            <Select
                                value={convertType}
                                onChange={setConvertType}
                                style={{ width: '100%', marginTop: 4 }}
                                options={transactionTypes}
                            />
                        </div>
                        <Button onClick={createProposal} type="default">Build Proposal</Button>
                        {convertProposal && (
                            <Card size="small" title="Proposal Payload">
                                {convertProposal.missing_fields?.length > 0 && (
                                    <Alert type="warning" message="Missing fields" description={convertProposal.missing_fields.join(', ')} style={{ marginBottom: 8 }} />
                                )}
                                {convertProposal.warnings?.length > 0 && (
                                    <Alert type="info" message="Warnings" description={convertProposal.warnings.join('; ')} style={{ marginBottom: 8 }} />
                                )}
                                <pre style={{ maxHeight: 320, overflow: 'auto', background: '#fafafa', padding: 8 }}>
                                    {JSON.stringify(convertProposal.payload, null, 2)}
                                </pre>
                                <Space>
                                    <Button
                                        type="primary"
                                        loading={converting}
                                        disabled={convertProposal.status === 'needs_review' || !hasPerm(permissions, 'document_upload.convert')}
                                        onClick={() => convert(false)}
                                    >
                                        Create Draft
                                    </Button>
                                    <Tag color={convertProposal.status === 'ready' ? 'green' : 'gold'}>{convertProposal.status}</Tag>
                                </Space>
                            </Card>
                        )}
                    </Space>
                </Drawer>
            </div>
        </AuthenticatedLayout>
    );
}

function ExtractionView({ data }) {
    const e = data.extraction;
    const n = e?.normalized_json || {};
    if (!e) return <Alert type="info" message="No extraction yet." />;
    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space>
                <Tag color="blue">{n.document_type}</Tag>
                {typeof n.confidence === 'number' && <Tag>Confidence: {Math.round(n.confidence * 100)}%</Tag>}
                <Tag>Status: {e.status}</Tag>
            </Space>
            {n.warnings?.length > 0 && (
                <Alert type="warning" message="Warnings" description={n.warnings.join('; ')} />
            )}
            {n.missing_fields?.length > 0 && (
                <Alert type="info" message="Missing fields" description={n.missing_fields.join(', ')} />
            )}
            <Card size="small" title="Party">
                <pre style={{ margin: 0 }}>{JSON.stringify(n.party, null, 2)}</pre>
            </Card>
            <Card size="small" title="Document Details">
                <Text>Number: {n.document_number || '—'}</Text><br />
                <Text>Date: {n.document_date || '—'}</Text><br />
                <Text>Due: {n.due_date || '—'}</Text><br />
                <Text>Currency: {n.currency_code || '—'}</Text>
            </Card>
            <Card size="small" title="Lines">
                <Table
                    size="small"
                    pagination={false}
                    rowKey={(r, i) => i}
                    dataSource={n.lines || []}
                    columns={[
                        { title: 'Description', dataIndex: 'description' },
                        { title: 'Qty', dataIndex: 'quantity' },
                        { title: 'Rate', dataIndex: 'rate' },
                        { title: 'Tax', dataIndex: 'tax_amount' },
                        { title: 'Amount', dataIndex: 'amount' },
                    ]}
                />
            </Card>
            <Card size="small" title="Totals">
                <pre style={{ margin: 0 }}>{JSON.stringify(n.totals, null, 2)}</pre>
            </Card>
            {n.payment && (
                <Card size="small" title="Payment">
                    <pre style={{ margin: 0 }}>{JSON.stringify(n.payment, null, 2)}</pre>
                </Card>
            )}
        </Space>
    );
}

function MatchList({ matches, docId, onChanged }) {
    if (!matches?.length) return <Alert type="info" message="No matches yet. Run AI scan to extract entities." />;
    return (
        <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={matches}
            columns={[
                { title: 'Type', dataIndex: 'entity_type' },
                { title: 'Extracted Name', dataIndex: 'extracted_name' },
                {
                    title: 'Status',
                    dataIndex: 'match_status',
                    render: (v) => <Tag color={v === 'matched' || v === 'created' ? 'green' : v === 'suggested' ? 'gold' : 'red'}>{v}</Tag>,
                },
                { title: 'Matched ID', dataIndex: 'matched_id', render: (v) => v || '—' },
            ]}
        />
    );
}
