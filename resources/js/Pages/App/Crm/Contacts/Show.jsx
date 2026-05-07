import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  EditOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  ShopOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Title, Text } = Typography;

const BACKEND = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND}${path}`;

const hasRoute = () => typeof route !== 'undefined' && typeof route === 'function';

const safeRoute = (name, params = null, fallback = '#') => {
  try {
    if (hasRoute()) return params ? route(name, params) : route(name);
    return fallback;
  } catch {
    return fallback;
  }
};

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const isBlank = (value) => value === null || value === undefined || value === '';
const emptyText = <Text type="secondary">Not Available</Text>;

const displayValue = (value) => {
  if (isBlank(value)) return emptyText;
  return value;
};

const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatDate = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatMoney = (value) => {
  const num = Number(value || 0);

  return `NPR ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const relationLabel = (record, camel, snake) => {
  return (
    record?.[camel]?.label ||
    record?.[camel]?.name ||
    record?.[camel]?.display_name ||
    record?.[snake]?.label ||
    record?.[snake]?.name ||
    record?.[snake]?.display_name ||
    record?.[`${snake}_detail`]?.label ||
    record?.[`${snake}_detail`]?.name ||
    record?.[`${snake}_name`] ||
    null
  );
};

const getTypeTag = (type) => {
  if (type === 'supplier') return <Tag color="purple">Supplier</Tag>;
  if (type === 'customer') return <Tag color="blue">Customer</Tag>;
  if (type === 'lead') return <Tag color="gold">Lead</Tag>;

  return <Tag>{titleCase(type || 'Unknown')}</Tag>;
};

const getStatusTag = (active) => {
  if (active !== false) {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />}>
        Active
      </Tag>
    );
  }

  return (
    <Tag color="error" icon={<StopOutlined />}>
      Inactive
    </Tag>
  );
};

const resolveTransactionUrl = (row) => {
  const type = String(row?.document_type || row?.module || row?.type || '').toLowerCase();
  const id = row?.document_id || row?.record_id || row?.id;

  if (!id) return null;

  const map = {
    invoice: ['sales.invoices.show', `/sales/invoices/${id}`],
    sales_invoice: ['sales.invoices.show', `/sales/invoices/${id}`],
    purchase_bill: ['purchase.bills.show', `/purchase-bills/${id}`],
    bill: ['purchase.bills.show', `/purchase-bills/${id}`],
    expense: ['expenses.show', `/expenses/${id}`],
    debit_note: ['debit-notes.show', `/debit-notes/${id}`],
    credit_note: ['credit-notes.show', `/credit-notes/${id}`],
    customer_payment: ['customer-payments.show', `/customer-payments/${id}`],
    supplier_payment: ['supplier-payments.show', `/supplier-payments/${id}`],
    payment: ['supplier-payments.show', `/supplier-payments/${id}`],
    journal_voucher: ['journal-vouchers.show', `/journal-vouchers/${id}`],
  };

  const resolved = map[type];

  if (!resolved) return null;

  return safeRoute(resolved[0], id, resolved[1]);
};

function InfoLine({ icon, label, value }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr',
        gap: 10,
        padding: '10px 0',
        alignItems: 'start',
      }}
    >
      <div style={{ color: '#8c98a8', fontSize: 16 }}>{icon}</div>

      <div>
        <div style={{ fontSize: 12, color: '#7b8494', marginBottom: 2 }}>
          {label}
        </div>

        <div style={{ fontSize: 14, color: '#111827', wordBreak: 'break-word' }}>
          {displayValue(value)}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ title, value, tone = 'default' }) {
  const colors = {
    default: '#111827',
    blue: '#0958d9',
    green: '#389e0d',
    orange: '#d46b08',
    red: '#cf1322',
  };

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        height: '100%',
      }}
      styles={{
        body: {
          padding: 16,
        },
      }}
    >
      <Statistic
        title={<span style={{ fontSize: 12 }}>{title}</span>}
        value={value}
        valueStyle={{
          fontSize: 20,
          fontWeight: 700,
          color: colors[tone] || colors.default,
        }}
      />
    </Card>
  );
}

export default function ContactShow({ auth, id }) {
  const { token } = theme.useToken();

  const [record, setRecord] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const contactId = id || record?.id;

  useEffect(() => {
    let mounted = true;

    async function loadContact() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(api(`/api/contacts/${id}`), {
          headers: authHeaders(),
        });

        if (!res.ok) {
          throw new Error('Failed to load contact.');
        }

        const data = await res.json();

        if (mounted) {
          setRecord(data?.data ?? data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load contact.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadContact();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function loadTransactions() {
      try {
        setTransactionLoading(true);

        const res = await fetch(api(`/api/contacts/${id}/transactions`), {
          headers: authHeaders(),
        });

        if (!res.ok) {
          if (mounted) setTransactions([]);
          return;
        }

        const data = await res.json();
        const rows = data?.results || data?.data || data || [];

        if (mounted) {
          setTransactions(Array.isArray(rows) ? rows : []);
        }
      } catch {
        if (mounted) {
          setTransactions([]);
        }
      } finally {
        if (mounted) {
          setTransactionLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayName = record?.name || 'Unnamed Contact';
  const displayCode = record?.code || '-';
  const contactType = record?.contact_type || '-';
  const isSupplier = contactType === 'supplier';

  const contactGroupName = relationLabel(record, 'contactGroup', 'contact_group');
  const creditTermName = relationLabel(record, 'creditTerm', 'credit_term');

  const totalDebit = useMemo(() => {
    return transactions.reduce((sum, row) => {
      const type = String(row.type || row.entry_type || '').toLowerCase();
      const explicitDebit = Number(row.debit || row.dr || 0);
      const amount = Number(row.amount || row.total || row.grand_total || 0);

      if (explicitDebit > 0) return sum + explicitDebit;
      if (type === 'dr' || type === 'debit') return sum + amount;

      return sum;
    }, 0);
  }, [transactions]);

  const totalCredit = useMemo(() => {
    return transactions.reduce((sum, row) => {
      const type = String(row.type || row.entry_type || '').toLowerCase();
      const explicitCredit = Number(row.credit || row.cr || 0);
      const amount = Number(row.amount || row.total || row.grand_total || 0);

      if (explicitCredit > 0) return sum + explicitCredit;
      if (type === 'cr' || type === 'credit') return sum + amount;

      return sum;
    }, 0);
  }, [transactions]);

  const balance = totalDebit - totalCredit;

  const updateActiveStatus = async () => {
    if (!contactId) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch(api(`/api/contacts/${contactId}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          active: !record?.active,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update contact status.');
      }

      const data = await res.json();
      setRecord(data?.data ?? data);
    } catch (err) {
      setError(err.message || 'Failed to update contact status.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    router.visit(safeRoute('crm.contacts.index', null, '/crm/contacts'));
  };

  const goEdit = () => {
    router.visit(safeRoute('crm.contacts.edit', contactId, `/crm/contacts/${contactId}/edit`));
  };

  const actionItems = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: goEdit,
    },
    {
      key: 'toggle-status',
      icon: record?.active ? <StopOutlined /> : <CheckCircleOutlined />,
      label: record?.active ? 'Make Inactive' : 'Make Active',
      onClick: updateActiveStatus,
    },
    {
      type: 'divider',
    },
    {
      key: 'purchase-bill',
      label: 'Create Purchase Bill',
      disabled: !isSupplier,
      onClick: () =>
        router.visit(
          safeRoute(
            'purchase-bills.create',
            { contact_id: contactId },
            `/purchase-bills/create?contact_id=${contactId}`
          )
        ),
    },
    {
      key: 'purchase-order',
      label: 'Create Purchase Order',
      disabled: !isSupplier,
      onClick: () =>
        router.visit(
          safeRoute(
            'purchase-orders.create',
            { contact_id: contactId },
            `/purchase-orders/create?contact_id=${contactId}`
          )
        ),
    },
    {
      key: 'expense',
      label: 'Create Expense',
      disabled: !isSupplier,
      onClick: () =>
        router.visit(
          safeRoute(
            'expenses.create',
            { contact_id: contactId },
            `/expenses/create?contact_id=${contactId}`
          )
        ),
    },
  ];

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 130,
      render: (_, row) => formatDate(row.date || row.transaction_date || row.created_at),
    },
    {
      title: 'Transaction',
      dataIndex: 'title',
      render: (_, row) => (
        <div>
          <Text strong>
            {row.title || row.document_type || row.type || 'Transaction'}
          </Text>

          <div style={{ marginTop: 2 }}>
            <Text type="secondary">
              {row.number || row.no || row.reference || row.document_no || '-'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      width: 150,
      align: 'right',
      render: (_, row) => {
        const type = String(row.type || row.entry_type || '').toLowerCase();
        const amount = Number(row.debit || row.dr || 0);

        if (amount > 0) return formatMoney(amount);

        if (type === 'dr' || type === 'debit') {
          return formatMoney(row.amount || row.total || row.grand_total || 0);
        }

        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      width: 150,
      align: 'right',
      render: (_, row) => {
        const type = String(row.type || row.entry_type || '').toLowerCase();
        const amount = Number(row.credit || row.cr || 0);

        if (amount > 0) return formatMoney(amount);

        if (type === 'cr' || type === 'credit') {
          return formatMoney(row.amount || row.total || row.grand_total || 0);
        }

        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      width: 150,
      align: 'right',
      render: (_, row) => {
        if (row.balance === null || row.balance === undefined) {
          return <Text type="secondary">-</Text>;
        }

        return <Text strong>{formatMoney(row.balance)}</Text>;
      },
    },
  ];

  const transactionTableRowFunction = (row) => ({
    onClick: (event) => {
      const blockedSelector = [
        'button',
        'a',
        'input',
        'textarea',
        'select',
        '.ant-checkbox-wrapper',
        '.ant-switch',
        '.ant-dropdown-trigger',
        '.ant-btn',
        '.ant-tag',
        '.ant-select',
      ].join(',');

      if (event.target.closest(blockedSelector)) return;

      const url = resolveTransactionUrl(row);

      if (url) {
        router.visit(url);
      }
    },
    onMouseEnter: (event) => {
      event.currentTarget.style.background = '#fafafa';
    },
    onMouseLeave: (event) => {
      event.currentTarget.style.background = '';
    },
    style: {
      cursor: resolveTransactionUrl(row) ? 'pointer' : 'default',
    },
  });

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={record?.name ? `Contact - ${record.name}` : 'Contact Details'} />

      <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
        <div
          style={{
            height: 56,
            background: '#ffffff',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <Space size={12}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={goBack}
              style={{
                fontWeight: 600,
                paddingLeft: 0,
              }}
            >
              Contacts
            </Button>

            <Text type="secondary">/</Text>

            <Text strong>{displayCode}</Text>
          </Space>

          <Space>
            <Button icon={<EditOutlined />} onClick={goEdit}>
              Edit
            </Button>

            <Dropdown menu={{ items: actionItems }} placement="bottomRight" trigger={['click']}>
              <Button loading={saving} icon={<MoreOutlined />}>
                Options
              </Button>
            </Dropdown>

            <Button type="text" icon={<CloseOutlined />} onClick={goBack} />
          </Space>
        </div>

        <div style={{ padding: 16 }}>
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              closable
              onClose={() => setError('')}
              style={{ marginBottom: 16 }}
            />
          )}

          {loading && (
            <Card>
              <Skeleton active paragraph={{ rows: 10 }} />
            </Card>
          )}

          {!loading && !record && !error && (
            <Card>
              <Empty description="Contact not found" />
            </Card>
          )}

          {!loading && record && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={7} xl={6}>
                <Card
                  style={{ borderRadius: 10 }}
                  styles={{ body: { padding: 18 } }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Avatar
                      size={56}
                      style={{
                        background: '#1677ff',
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {initials(displayName)}
                    </Avatar>

                    <div style={{ minWidth: 0 }}>
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          lineHeight: 1.25,
                        }}
                        ellipsis
                      >
                        {displayName}
                      </Title>

                      <Space size={6} wrap style={{ marginTop: 6 }}>
                        {getTypeTag(contactType)}
                        {getStatusTag(record.active)}
                      </Space>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <InfoLine icon={<PhoneOutlined />} label="Phone" value={record.phone} />
                    <InfoLine icon={<MailOutlined />} label="Email" value={record.email} />
                    <InfoLine icon={<UserOutlined />} label="PAN" value={record.pan} />
                    <InfoLine icon={<ShopOutlined />} label="Address" value={record.address} />
                  </div>
                </Card>

                <Card
                  title="Contact Status"
                  size="small"
                  style={{
                    marginTop: 16,
                    borderRadius: 10,
                  }}
                >
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Status</Text>
                      {getStatusTag(record.active)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Type</Text>
                      {getTypeTag(contactType)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Group</Text>
                      {contactGroupName ? <Tag>{contactGroupName}</Tag> : <Text type="secondary">None</Text>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Purchase</Text>
                      {record.accept_purchase ? (
                        <Tag color="green">Allowed</Tag>
                      ) : (
                        <Tag color="red">Not Allowed</Tag>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Source</Text>
                      {record.is_system_generated ? <Tag>System</Tag> : <Tag color="processing">Manual</Tag>}
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={17} xl={18}>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} xl={6}>
                    <MiniStat title="Credit Limit" value={formatMoney(record.credit_limit)} tone="green" />
                  </Col>

                  <Col xs={24} sm={12} xl={6}>
                    <MiniStat title="Total Debit" value={formatMoney(totalDebit)} tone="blue" />
                  </Col>

                  <Col xs={24} sm={12} xl={6}>
                    <MiniStat title="Total Credit" value={formatMoney(totalCredit)} tone="orange" />
                  </Col>

                  <Col xs={24} sm={12} xl={6}>
                    <MiniStat
                      title="Balance"
                      value={formatMoney(balance)}
                      tone={balance < 0 ? 'red' : 'default'}
                    />
                  </Col>
                </Row>

                <Card
                  title="Overview"
                  style={{ borderRadius: 10, marginBottom: 16 }}
                  styles={{ body: { padding: 0 } }}
                >
                  <Descriptions
                    bordered
                    size="small"
                    column={{
                      xs: 1,
                      sm: 1,
                      md: 2,
                      lg: 2,
                      xl: 3,
                    }}
                  >
                    <Descriptions.Item label="Name">
                      <Text strong>{displayValue(record.name)}</Text>
                    </Descriptions.Item>

                    <Descriptions.Item label="Code">
                      {displayValue(record.code)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Type">
                      {getTypeTag(contactType)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Phone">
                      {displayValue(record.phone)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Email">
                      {record.email ? <a href={`mailto:${record.email}`}>{record.email}</a> : emptyText}
                    </Descriptions.Item>

                    <Descriptions.Item label="PAN">
                      {displayValue(record.pan)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Tax Type">
                      {displayValue(titleCase(record.tax_registration_type))}
                    </Descriptions.Item>

                    <Descriptions.Item label="Tax No">
                      {displayValue(record.tax_registration_no)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Credit Limit">
                      {formatMoney(record.credit_limit)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Contact Group">
                      {displayValue(contactGroupName)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Credit Term">
                      {displayValue(creditTermName)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Purchase Allowed">
                      {record.accept_purchase ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}
                    </Descriptions.Item>

                    <Descriptions.Item label="Address" span={3}>
                      {displayValue(record.address)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Created At">
                      {formatDateTime(record.created_at)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Updated At">
                      {formatDateTime(record.updated_at)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  title="Transactions"
                  extra={
                    <Space>
                      <Button
                        onClick={() =>
                          router.visit(
                            safeRoute(
                              'purchase-bills.create',
                              { contact_id: contactId },
                              `/purchase-bills/create?contact_id=${contactId}`
                            )
                          )
                        }
                        disabled={!isSupplier}
                      >
                        Purchase Bill
                      </Button>

                      <Button
                        type="primary"
                        onClick={() =>
                          router.visit(
                            safeRoute(
                              'supplier-payments.create',
                              { contact_id: contactId },
                              `/supplier-payments/create?contact_id=${contactId}`
                            )
                          )
                        }
                        disabled={!isSupplier}
                      >
                        Record Payment
                      </Button>
                    </Space>
                  }
                  style={{ borderRadius: 10 }}
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    rowKey={(row, index) => row.id || row.document_id || index}
                    columns={transactionColumns}
                    dataSource={transactions}
                    loading={transactionLoading}
                    size="middle"
                    onRow={transactionTableRowFunction}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: false,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No transactions found for this contact"
                        />
                      ),
                    }}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}