import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Alert,
    Avatar,
    Button,
    Card,
    Col,
    Divider,
    Empty,
    Input,
    Row,
    Segmented,
    Skeleton,
    Space,
    Tag,
    Typography,
    Upload,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    BankOutlined,
    CalendarOutlined,
    CheckCircleFilled,
    CloseOutlined,
    DollarOutlined,
    EllipsisOutlined,
    FileAddOutlined,
    GlobalOutlined,
    MailOutlined,
    PhoneOutlined,
    SmileOutlined,
    UserOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;
const { TextArea } = Input;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const isNil = (v) => v === null || v === undefined || v === '';

const get = (record, snake, camel = null) => {
    if (!record) return null;
    return record?.[camel || snake] ?? record?.[snake] ?? null;
};

const normalize = (value) => {
    if (isNil(value)) return 'Not Available';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const formatDate = (value) => {
    if (isNil(value)) return 'Not Available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
};

const formatDateTime = (value) => {
    if (isNil(value)) return 'Not Available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatMoney = (value) => {
    if (isNil(value)) return 'Not Set';

    const number = Number(value);

    if (Number.isNaN(number)) return String(value);

    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(number);
};

const relationName = (value) => {
    if (isNil(value)) return 'Not Available';

    if (typeof value === 'object') {
        return (
            value.name ||
            value.full_name ||
            value.title ||
            value.company_name ||
            value.email ||
            value.phone ||
            value.code ||
            value.lead_no ||
            value.deal_no ||
            value.id ||
            'Not Available'
        );
    }

    return String(value);
};

const getInitials = (name = '') => {
    const parts = String(name || 'Lead')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) return 'L';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const leadDisplayStatus = (status) => {
    if (status === 'converted') return 'Won';
    if (status === 'lost' || status === 'unqualified') return 'Lost';
    return 'Pending';
};

const statusColor = {
    new: 'blue',
    contacted: 'cyan',
    qualified: 'green',
    unqualified: 'default',
    converted: 'purple',
    lost: 'red',
};

const priorityColor = {
    low: 'default',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

function StatusDot({ color }) {
    return (
        <span
            style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
            }}
        />
    );
}

function DataValue({ value, type }) {
    const { token } = theme.useToken();

    if (type === 'money') return formatMoney(value);
    if (type === 'date') return formatDate(value);
    if (type === 'datetime') return formatDateTime(value);
    if (type === 'relation') return relationName(value);

    if (type === 'boolean') {
        return (
            <Tag color={value ? 'green' : 'red'}>
                {value ? 'Yes' : 'No'}
            </Tag>
        );
    }

    if (typeof value === 'object' && value !== null) {
        return relationName(value);
    }

    return (
        <Text
            style={{
                color: isNil(value) ? token.colorTextTertiary : token.colorText,
                fontStyle: isNil(value) ? 'italic' : 'normal',
            }}
        >
            {isNil(value) ? 'Not Available' : String(value)}
        </Text>
    );
}

function HeaderBar({ title }) {
    const { token } = theme.useToken();

    return (
        <div
            style={{
                height: 74,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            }}
        >
            <Space size={24}>
                <Link href={route('leads.index')}>
                    <Title level={4} style={{ margin: 0 }}>
                        Leads
                    </Title>
                </Link>

                <Text style={{ fontSize: 24, color: token.colorTextSecondary }}>/</Text>

                <Text style={{ fontSize: 18 }}>{title}</Text>
            </Space>

            <Space size={18}>
                <Button
                    type="text"
                    style={{
                        color: token.colorSuccess,
                        fontWeight: 700,
                        letterSpacing: 1,
                    }}
                >
                    OPTION
                </Button>

                <Button type="text" icon={<EllipsisOutlined style={{ fontSize: 22 }} />} />

                <Link href={route('leads.index')}>
                    <Button type="text" icon={<CloseOutlined style={{ fontSize: 20 }} />} />
                </Link>
            </Space>
        </div>
    );
}

function SidebarInfoRow({ label, value, type, bordered = true }) {
    const { token } = theme.useToken();

    return (
        <div
            style={{
                padding: '17px 24px',
                borderBottom: bordered ? `1px solid ${token.colorBorderSecondary}` : 'none',
            }}
        >
            <Row gutter={16}>
                <Col span={9}>
                    <Text
                        style={{
                            color: token.colorTextSecondary,
                            fontSize: 12,
                            textTransform: 'uppercase',
                            lineHeight: 1.25,
                        }}
                    >
                        {label}
                    </Text>
                </Col>

                <Col span={15}>
                    <Text style={{ fontSize: 15 }}>
                        <DataValue value={value} type={type} />
                    </Text>
                </Col>
            </Row>
        </div>
    );
}

function SidebarNav({ activeTab, setActiveTab }) {
    const { token } = theme.useToken();

    const items = [
        'Overview',
        'Contact',
        'Address',
        'Tracking',
        'Conversion',
        'System',
        'Documents',
    ];

    return (
        <div style={{ paddingTop: 24 }}>
            {items.map((item) => {
                const active = activeTab === item;

                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setActiveTab(item)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: active ? token.colorFillSecondary : 'transparent',
                            padding: '16px 24px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: token.colorText,
                            fontSize: 16,
                            fontWeight: active ? 600 : 400,
                        }}
                    >
                        {item}
                    </button>
                );
            })}
        </div>
    );
}

function SectionCard({ title, icon, children }) {
    const { token } = theme.useToken();

    return (
        <Card
            title={
                <Space>
                    {icon}
                    <span>{title}</span>
                </Space>
            }
            style={{ borderRadius: 4 }}
            styles={{
                header: {
                    minHeight: 44,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                },
                body: {
                    padding: 0,
                },
            }}
        >
            {children}
        </Card>
    );
}

function FieldGrid({ items }) {
    const { token } = theme.useToken();

    return (
        <Row>
            {items.map((item) => (
                <Col xs={24} md={12} key={item.label}>
                    <div
                        style={{
                            padding: '15px 18px',
                            borderRight: `1px solid ${token.colorBorderSecondary}`,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            minHeight: 76,
                        }}
                    >
                        <Text
                            style={{
                                display: 'block',
                                fontSize: 12,
                                color: token.colorTextSecondary,
                                textTransform: 'uppercase',
                                marginBottom: 6,
                            }}
                        >
                            {item.label}
                        </Text>

                        <DataValue value={item.value} type={item.type} />
                    </div>
                </Col>
            ))}
        </Row>
    );
}

function ContactProfileCard({ record }) {
    const { token } = theme.useToken();

    const name = record?.name || record?.company_name || 'Lead';
    const contact = get(record, 'contact');
    const contactName = relationName(contact) !== 'Not Available' ? relationName(contact) : name;

    const rows = [
        {
            icon: <PhoneOutlined />,
            value: record?.phone || record?.mobile,
        },
        {
            icon: <MailOutlined />,
            value: record?.email,
        },
        {
            icon: <GlobalOutlined />,
            value: record?.website,
        },
        {
            icon: <SmileOutlined />,
            value: record?.industry,
        },
    ];

    return (
        <Card
            style={{
                borderRadius: 4,
                borderColor: token.colorBorder,
            }}
            styles={{
                body: {
                    padding: 28,
                },
            }}
        >
            <Row align="middle" gutter={[28, 20]}>
                <Col xs={24} lg={12}>
                    <Space size={16}>
                        <Avatar
                            size={72}
                            style={{
                                background: token.colorPrimary,
                                color: token.colorWhite,
                                fontWeight: 700,
                                fontSize: 25,
                            }}
                        >
                            {getInitials(contactName)}
                        </Avatar>

                        <div>
                            <Title level={4} style={{ margin: 0, fontWeight: 500 }}>
                                {contactName}
                            </Title>

                            <Text style={{ color: token.colorTextSecondary, fontSize: 15 }}>
                                {record?.company_name || 'Lead'}
                            </Text>
                        </div>
                    </Space>
                </Col>

                <Col xs={24} lg={12}>
                    <Space direction="vertical" size={12}>
                        {rows.map((row, index) => (
                            <Space key={index} size={18}>
                                <span
                                    style={{
                                        color: token.colorTextTertiary,
                                        fontSize: 21,
                                        width: 24,
                                    }}
                                >
                                    {row.icon}
                                </span>

                                <Text
                                    italic={isNil(row.value)}
                                    style={{
                                        fontSize: 15,
                                        color: isNil(row.value)
                                            ? token.colorTextSecondary
                                            : token.colorText,
                                    }}
                                >
                                    {row.value || 'Not Available'}
                                </Text>
                            </Space>
                        ))}
                    </Space>
                </Col>
            </Row>
        </Card>
    );
}

function DocumentsBox() {
    const { token } = theme.useToken();

    return (
        <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 22 }}>
                Documents
            </Title>

            <Upload.Dragger
                multiple
                beforeUpload={() => false}
                style={{
                    background: token.colorBgContainer,
                    borderRadius: 2,
                    borderColor: token.colorBorder,
                }}
            >
                <p style={{ marginBottom: 8 }}>
                    <FileAddOutlined style={{ fontSize: 28, color: token.colorTextSecondary }} />
                </p>

                <Text style={{ fontSize: 15 }}>
                    Drop your files or{' '}
                    <Text style={{ color: token.colorSuccess, cursor: 'pointer' }}>
                        Click to upload
                    </Text>{' '}
                    new document
                </Text>
            </Upload.Dragger>
        </div>
    );
}

export default function LeadShow({ auth, id }) {
    const { token } = theme.useToken();

    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Overview');

    useEffect(() => {
        let mounted = true;

        async function loadLead() {
            try {
                setLoading(true);
                setError('');

                const accessToken = localStorage.getItem('accessToken');

                const response = await fetch(api(`/api/leads/${id}`), {
                    headers: {
                        Accept: 'application/json',
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.message || `Failed to load lead #${id}`);
                }

                if (mounted) {
                    setRecord(payload?.data ?? payload);
                }
            } catch (e) {
                if (mounted) {
                    setError(e?.message || 'Failed to load lead');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        if (id) loadLead();

        return () => {
            mounted = false;
        };
    }, [id]);

    const title = useMemo(() => {
        if (!record) return `Lead #${id}`;
        return record.company_name || record.name || record.lead_no || `Lead #${id}`;
    }, [record, id]);

    const assignedTo = get(record, 'assigned_to', 'assignedTo');
    const convertedContact = get(record, 'converted_contact', 'convertedContact');
    const convertedDeal = get(record, 'converted_deal', 'convertedDeal');
    const contact = get(record, 'contact');

    const statusValue = leadDisplayStatus(record?.status);

    const summaryFields = [
        { label: 'Lead No', value: record?.lead_no },
        { label: 'Lead Name', value: record?.name },
        { label: 'Company Name', value: record?.company_name },
        { label: 'Expected Value', value: record?.expected_value, type: 'money' },
        { label: 'Lead Source', value: record?.lead_source },
        { label: 'Industry', value: record?.industry },
        { label: 'Status', value: normalize(record?.status) },
        { label: 'Priority', value: normalize(record?.priority) },
    ];

    const contactFields = [
        { label: 'Contact Relation', value: contact, type: 'relation' },
        { label: 'Contact ID', value: record?.contact_id },
        { label: 'Email', value: record?.email },
        { label: 'Phone', value: record?.phone },
        { label: 'Mobile', value: record?.mobile },
        { label: 'Website', value: record?.website },
    ];

    const addressFields = [
        { label: 'Address', value: record?.address },
        { label: 'City', value: record?.city },
        { label: 'State', value: record?.state },
        { label: 'Country', value: record?.country },
    ];

    const trackingFields = [
        { label: 'Assigned To', value: assignedTo, type: 'relation' },
        { label: 'Assigned To ID', value: record?.assigned_to_id },
        { label: 'Next Follow Up Date', value: record?.next_follow_up_date, type: 'datetime' },
        { label: 'Last Contacted At', value: record?.last_contacted_at, type: 'datetime' },
    ];

    const conversionFields = [
        { label: 'Converted Contact', value: convertedContact, type: 'relation' },
        { label: 'Converted Contact ID', value: record?.converted_contact_id },
        { label: 'Converted Deal', value: convertedDeal, type: 'relation' },
        { label: 'Converted Deal ID', value: record?.converted_deal_id },
        { label: 'Converted At', value: record?.converted_at, type: 'datetime' },
    ];

    const systemFields = [
        { label: 'Record ID', value: record?.id },
        { label: 'User Add ID', value: record?.user_add_id },
        { label: 'Active', value: record?.active, type: 'boolean' },
        { label: 'System Generated', value: record?.is_system_generated, type: 'boolean' },
        { label: 'Created At', value: record?.created_at, type: 'datetime' },
        { label: 'Updated At', value: record?.updated_at, type: 'datetime' },
    ];

    const renderTab = () => {
        if (!record) return null;

        if (activeTab === 'Overview') {
            return (
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    <ContactProfileCard record={record} />

                    <SectionCard title="Lead Summary" icon={<UserOutlined />}>
                        <FieldGrid items={summaryFields} />
                    </SectionCard>

                    <SectionCard title="Notes" icon={<FileAddOutlined />}>
                        <div style={{ padding: 18 }}>
                            <TextArea
                                value={record.notes || ''}
                                placeholder="No notes available"
                                autoSize={{ minRows: 4, maxRows: 8 }}
                                readOnly
                            />
                        </div>
                    </SectionCard>

                    <DocumentsBox />
                </Space>
            );
        }

        if (activeTab === 'Contact') {
            return (
                <SectionCard title="Contact Information" icon={<PhoneOutlined />}>
                    <FieldGrid items={contactFields} />
                </SectionCard>
            );
        }

        if (activeTab === 'Address') {
            return (
                <SectionCard title="Address Information" icon={<GlobalOutlined />}>
                    <FieldGrid items={addressFields} />
                </SectionCard>
            );
        }

        if (activeTab === 'Tracking') {
            return (
                <SectionCard title="Follow Up & Assignment" icon={<CalendarOutlined />}>
                    <FieldGrid items={trackingFields} />
                </SectionCard>
            );
        }

        if (activeTab === 'Conversion') {
            return (
                <SectionCard title="Conversion Information" icon={<CheckCircleFilled />}>
                    <FieldGrid items={conversionFields} />
                </SectionCard>
            );
        }

        if (activeTab === 'System') {
            return (
                <SectionCard title="System Information" icon={<BankOutlined />}>
                    <FieldGrid items={systemFields} />
                </SectionCard>
            );
        }

        if (activeTab === 'Documents') {
            return <DocumentsBox />;
        }

        return <Empty description="No data available" />;
    };

    return (
        <AuthenticatedLayout user={auth?.user}>
            <Head title={title} />

            <div
                style={{
                    background: token.colorBgLayout,
                    minHeight: '100vh',
                    margin: -24,
                }}
            >
                <HeaderBar title={title} />

                {loading && (
                    <div style={{ padding: 24 }}>
                        <Card>
                            <Skeleton active paragraph={{ rows: 14 }} />
                        </Card>
                    </div>
                )}

                {!loading && error && (
                    <div style={{ padding: 24 }}>
                        <Alert
                            type="error"
                            showIcon
                            message={error}
                            action={
                                <Link href={route('leads.index')}>
                                    <Button size="small" icon={<ArrowLeftOutlined />}>
                                        Back
                                    </Button>
                                </Link>
                            }
                        />
                    </div>
                )}

                {!loading && !error && !record && (
                    <div style={{ padding: 24 }}>
                        <Card>
                            <Empty description="Lead not found" />
                        </Card>
                    </div>
                )}

                {!loading && !error && record && (
                    <Row gutter={0}>
                        <Col
                            xs={24}
                            lg={8}
                            xl={6}
                            style={{
                                background: token.colorBgContainer,
                                borderRight: `1px solid ${token.colorBorderSecondary}`,
                                minHeight: 'calc(100vh - 74px)',
                            }}
                        >
                            <div
                                style={{
                                    padding: 24,
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                }}
                            >
                                <Segmented
                                    block
                                    value={statusValue}
                                    options={[
                                        {
                                            label: (
                                                <Space size={8}>
                                                    <StatusDot color={token.colorSuccess} />
                                                    <span>Pending</span>
                                                </Space>
                                            ),
                                            value: 'Pending',
                                        },
                                        {
                                            label: (
                                                <Space size={8}>
                                                    <StatusDot color={token.colorTextTertiary} />
                                                    <span>Won</span>
                                                </Space>
                                            ),
                                            value: 'Won',
                                        },
                                        {
                                            label: (
                                                <Space size={8}>
                                                    <StatusDot color={token.colorTextTertiary} />
                                                    <span>Lost</span>
                                                </Space>
                                            ),
                                            value: 'Lost',
                                        },
                                    ]}
                                />
                            </div>

                            <SidebarInfoRow
                                label="Expected Value"
                                value={record.expected_value}
                                type="money"
                            />

                            <SidebarInfoRow
                                label="Closing Date"
                                value={record.next_follow_up_date}
                                type="date"
                            />

                            <SidebarInfoRow
                                label="Stage"
                                value={
                                    <Space>
                                        <StatusDot color={token.colorTextTertiary} />
                                        <span>{normalize(record.status)}</span>
                                    </Space>
                                }
                            />

                            <SidebarInfoRow
                                label="Priority"
                                value={
                                    <Tag color={priorityColor[record.priority] || 'default'}>
                                        {normalize(record.priority)}
                                    </Tag>
                                }
                            />

                            <div
                                style={{
                                    padding: '20px 24px',
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                }}
                            >
                                <Row gutter={16}>
                                    <Col span={9}>
                                        <Text
                                            style={{
                                                color: token.colorTextSecondary,
                                                fontSize: 12,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Assigned By
                                        </Text>

                                        <div style={{ marginTop: 14 }}>
                                            <Avatar
                                                size={40}
                                                style={{
                                                    background: token.colorPrimary,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {getInitials(auth?.user?.name || 'U')}
                                            </Avatar>
                                        </div>
                                    </Col>

                                    <Col span={15}>
                                        <Text
                                            style={{
                                                color: token.colorTextSecondary,
                                                fontSize: 12,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Assigned To
                                        </Text>

                                        <div style={{ marginTop: 14 }}>
                                            <Text style={{ fontSize: 15 }}>
                                                {relationName(assignedTo)}
                                            </Text>
                                        </div>
                                    </Col>
                                </Row>
                            </div>

                            <SidebarInfoRow
                                label="Created Date"
                                value={record.created_at}
                                type="datetime"
                            />

                            <SidebarInfoRow
                                label="Updated Date"
                                value={record.updated_at}
                                type="datetime"
                            />

                            <SidebarInfoRow
                                label="Created By"
                                value={record.user_add_id || auth?.user?.email}
                            />

                            <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
                        </Col>

                        <Col
                            xs={24}
                            lg={16}
                            xl={18}
                            style={{
                                padding: 16,
                                minHeight: 'calc(100vh - 74px)',
                            }}
                        >
                            <div
                                style={{
                                    background: token.colorBgContainer,
                                    minHeight: 'calc(100vh - 106px)',
                                    borderRadius: 4,
                                    padding: 24,
                                }}
                            >
                                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                                    <div>
                                        <Space wrap size={10} style={{ marginBottom: 16 }}>
                                            {record.lead_no && <Tag>{record.lead_no}</Tag>}

                                            {record.status && (
                                                <Tag color={statusColor[record.status] || 'default'}>
                                                    {normalize(record.status)}
                                                </Tag>
                                            )}

                                            {record.priority && (
                                                <Tag color={priorityColor[record.priority] || 'default'}>
                                                    {normalize(record.priority)}
                                                </Tag>
                                            )}

                                            {record.active !== undefined && (
                                                <Tag color={record.active ? 'green' : 'red'}>
                                                    {record.active ? 'Active' : 'Inactive'}
                                                </Tag>
                                            )}

                                            {record.is_system_generated && (
                                                <Tag color="purple">System Generated</Tag>
                                            )}
                                        </Space>

                                        <Title level={3} style={{ marginTop: 0, marginBottom: 18 }}>
                                            {title}
                                        </Title>

                                        <TextArea
                                            value={record.notes || ''}
                                            placeholder="Lead Description"
                                            autoSize={{ minRows: 2, maxRows: 5 }}
                                            readOnly
                                            style={{
                                                fontSize: 17,
                                                borderRadius: 8,
                                                resize: 'none',
                                            }}
                                        />
                                    </div>

                                    {record.status === 'converted' && (
                                        <Alert
                                            type="success"
                                            showIcon
                                            icon={<CheckCircleFilled />}
                                            message="This lead has been converted."
                                        />
                                    )}

                                    {record.status === 'lost' && (
                                        <Alert
                                            type="error"
                                            showIcon
                                            message="This lead is marked as lost."
                                        />
                                    )}

                                    <Divider style={{ margin: 0 }} />

                                    {renderTab()}
                                </Space>
                            </div>
                        </Col>
                    </Row>
                )}
            </div>
        </AuthenticatedLayout>
    );
}