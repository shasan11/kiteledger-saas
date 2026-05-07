import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ContactsOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  ScheduleOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const { Paragraph, Text, Title } = Typography;

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const safeRoute = (name, params, fallback) => {
  try {
    if (typeof route === 'function') return params ? route(name, params) : route(name);
  } catch {
    return fallback;
  }

  return fallback;
};

const unwrap = (payload) => payload?.data ?? payload;

const rowsFrom = (payload) => {
  const data = unwrap(payload);
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
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

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '-';

  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const labelize = (value) => {
  if (!value) return '-';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const displayName = (record) =>
  record?.name ||
  record?.display_name ||
  record?.company_name ||
  record?.title ||
  record?.subject ||
  record?.email ||
  '-';

const initials = (value = '') => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const statusColor = {
  active: 'success',
  inactive: 'error',
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  unqualified: 'volcano',
  converted: 'purple',
  lost: 'red',
  pending: 'orange',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
  customer: 'green',
  supplier: 'purple',
  lead: 'gold',
};

function Value({ value }) {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary">-</Text>;
  }

  return <span>{value}</span>;
}

function SmartTag({ value }) {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary">-</Text>;
  }

  return <Tag color={statusColor[value] || 'default'}>{labelize(value)}</Tag>;
}

function InfoTable({ rows = [], columns = 2 }) {
  const validRows = rows.filter(Boolean);
  const groupedRows = [];

  for (let i = 0; i < validRows.length; i += columns) {
    groupedRows.push(validRows.slice(i, i + columns));
  }

  return (
    <table className="crm-show__info-table">
      <tbody>
        {groupedRows.map((group, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, index) => {
              const item = group[index];

              return (
                <React.Fragment key={index}>
                  <th>{item?.label || ''}</th>
                  <td>{item ? item.value ?? '-' : ''}</td>
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RailTable({ rows = [] }) {
  return (
    <table className="crm-show__rail-table">
      <tbody>
        {rows.filter(Boolean).map((row) => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td>{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card
      className="crm-show__card"
      title={title}
      extra={extra}
      bordered={false}
    >
      {children}
    </Card>
  );
}

function RelatedTable({
  title,
  endpoint,
  params,
  columns,
  rowUrl,
  emptyText = 'No records found',
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const response = await axios.get(api(endpoint), {
          headers: authHeaders(),
          params: {
            ...params,
            page_size: 10,
          },
        });

        if (mounted) setRows(rowsFrom(response.data));
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [endpoint, JSON.stringify(params)]);

  return (
    <DetailsCard title={title}>
      <Table
        rowKey={(record, index) => record?.id || index}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        locale={{ emptyText }}
        onRow={(record) => ({
          onClick: () => {
            const url = rowUrl?.(record);
            if (url) router.visit(url);
          },
          style: { cursor: rowUrl ? 'pointer' : 'default' },
        })}
      />
    </DetailsCard>
  );
}

const activityColumns = [
  {
    title: 'Subject',
    dataIndex: 'subject',
    key: 'subject',
    render: (value, record) => (
      <Space direction="vertical" size={0}>
        <Text strong>{value || '-'}</Text>
        <Text type="secondary">{labelize(record?.activity_type)}</Text>
      </Space>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (value) => <SmartTag value={value || 'pending'} />,
  },
  {
    title: 'Due',
    dataIndex: 'due_at',
    key: 'due_at',
    width: 170,
    render: formatDateTime,
  },
];

const leadColumns = [
  {
    title: 'Lead',
    dataIndex: 'name',
    key: 'name',
    render: (value, record) => (
      <Space direction="vertical" size={0}>
        <Text strong>{value || '-'}</Text>
        <Text type="secondary">{record?.company_name || record?.email || 'No company'}</Text>
      </Space>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 130,
    render: (value) => <SmartTag value={value || 'new'} />,
  },
  {
    title: 'Value',
    dataIndex: 'expected_value',
    key: 'expected_value',
    width: 130,
    align: 'right',
    render: formatMoney,
  },
];

const dealColumns = [
  {
    title: 'Deal',
    dataIndex: 'title',
    key: 'title',
    render: (value, record) => value || record?.name || '-',
  },
  {
    title: 'Stage',
    dataIndex: 'stage',
    key: 'stage',
    width: 130,
    render: (value) => <SmartTag value={value} />,
  },
  {
    title: 'Value',
    dataIndex: 'amount',
    key: 'amount',
    width: 130,
    align: 'right',
    render: (value, record) => formatMoney(value ?? record?.expected_value),
  },
];

const documentColumns = (numberField, dateField, amountField, statusField = 'status') => [
  {
    title: 'Document',
    dataIndex: numberField,
    key: numberField,
    render: (value, record) => <Text strong>{value || record?.reference || '-'}</Text>,
  },
  {
    title: 'Date',
    dataIndex: dateField,
    key: dateField,
    width: 140,
    render: formatDate,
  },
  {
    title: 'Amount',
    dataIndex: amountField,
    key: amountField,
    width: 130,
    align: 'right',
    render: formatMoney,
  },
  {
    title: 'Status',
    dataIndex: statusField,
    key: statusField,
    width: 120,
    render: (value) => <SmartTag value={value} />,
  },
];

function ShowShell({ auth, id, endpoint, children, mapRecord }) {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get(api(`${endpoint}${id}/`), {
          headers: authHeaders(),
        });

        setRecord(unwrap(response.data));
      } catch (err) {
        const msg = err?.response?.data?.message || 'Failed to load record.';
        setError(msg);
        messageApi.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [endpoint, id]);

  const title = mapRecord(record)?.title || 'CRM Record';

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}
      <Head title={title} />

      <style>{`
        .crm-show {
          min-height: calc(100vh - 64px);
          background: ${token.colorBgLayout};
        }

        .crm-show__bar {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          background: ${token.colorBgContainer};
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .crm-show__crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .crm-show__body {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 8px;
        }

        .crm-show__rail {
          background: ${token.colorBgContainer};
          border-right: 1px solid ${token.colorBorderSecondary};
          min-height: calc(100vh - 108px);
          padding: 12px;
        }

        .crm-show__entity {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .crm-show__entity-title {
          margin: 0 !important;
          font-size: 15px !important;
          line-height: 1.25 !important;
          color: ${token.colorText};
        }

        .crm-show__entity-subtitle {
          display: block;
          font-size: 12px;
          margin-top: 2px;
        }

        .crm-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .crm-show__rail-section {
          padding: 10px 0;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .crm-show__rail-label {
          display: block;
          font-size: 12px;
          color: ${token.colorTextSecondary};
          margin-bottom: 2px;
        }

        .crm-show__rail-amount {
          font-size: 16px;
          font-weight: 700;
          color: ${token.colorText};
        }

        .crm-show__rail-table {
          width: 100%;
          margin-top: 10px;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }

        .crm-show__rail-table th {
          width: 76px;
          padding: 6px;
          background: ${token.colorFillAlter};
          border: 1px solid ${token.colorBorderSecondary};
          color: ${token.colorTextSecondary};
          font-weight: 600;
          text-align: left;
          vertical-align: top;
        }

        .crm-show__rail-table td {
          padding: 6px;
          border: 1px solid ${token.colorBorderSecondary};
          color: ${token.colorText};
          vertical-align: top;
          word-break: break-word;
        }

        .crm-show__tabs {
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .crm-show__tab {
          width: 100%;
          height: 34px;
          border: 0;
          border-radius: ${token.borderRadius}px;
          background: transparent;
          color: ${token.colorTextSecondary};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 9px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
        }

        .crm-show__tab:hover {
          background: ${token.colorFillAlter};
          color: ${token.colorText};
        }

        .crm-show__tab--active {
          background: ${token.colorPrimaryBg};
          color: ${token.colorPrimary};
        }

        .crm-show__main {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }

        .crm-show__card.ant-card {
          border-radius: ${token.borderRadius}px;
          box-shadow: none;
        }

        .crm-show__card .ant-card-head {
          min-height: 38px;
          padding: 0 10px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .crm-show__card .ant-card-head-title {
          font-size: 13px;
          font-weight: 700;
          color: ${token.colorText};
        }

        .crm-show__card .ant-card-body {
          padding: 10px;
          min-width: 0;
        }

        .crm-show__info-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
          border: 1px solid ${token.colorBorderSecondary};
        }

        .crm-show__info-table th {
          width: 15%;
          padding: 7px 8px;
          background: ${token.colorFillAlter};
          border: 1px solid ${token.colorBorderSecondary};
          color: ${token.colorTextSecondary};
          font-weight: 600;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .crm-show__info-table td {
          width: 35%;
          padding: 7px 8px;
          background: ${token.colorBgContainer};
          border: 1px solid ${token.colorBorderSecondary};
          color: ${token.colorText};
          vertical-align: top;
          word-break: break-word;
        }

        .crm-show .ant-table {
          font-size: 12px;
        }

        .crm-show .ant-table-thead > tr > th {
          padding: 7px 8px !important;
          background: ${token.colorFillAlter} !important;
          font-weight: 700;
          color: ${token.colorTextSecondary};
          white-space: nowrap;
        }

        .crm-show .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          vertical-align: middle;
        }

        .crm-show .ant-tag {
          margin-inline-end: 0;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 6px;
        }

        @media (max-width: 992px) {
          .crm-show__body {
            grid-template-columns: 1fr;
          }

          .crm-show__rail {
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid ${token.colorBorderSecondary};
          }

          .crm-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .crm-show__tab {
            width: auto;
            white-space: nowrap;
            flex: none;
          }

          .crm-show__info-table {
            min-width: 760px;
          }

          .crm-show__card .ant-card-body {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="crm-show">
        {error ? (
          <div style={{ padding: 12 }}>
            <Alert type="error" message={error} showIcon />
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: 18 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : null}

        {!loading && !record && !error ? (
          <div style={{ padding: 18 }}>
            <Empty description="Record not found" />
          </div>
        ) : null}

        {!loading && record ? children(record) : null}
      </div>
    </AuthenticatedLayout>
  );
}

function RecordLayout({
  record,
  title,
  subtitle,
  icon,
  tags,
  backLabel,
  backUrl,
  amountLabel,
  amount,
  railRows,
  tabs,
}) {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.key || 'overview');

  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <>
      <div className="crm-show__bar">
        <div className="crm-show__crumb">
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.visit(backUrl)}
          >
            {backLabel}
          </Button>

          <Text ellipsis style={{ maxWidth: 460 }}>
            {title}
          </Text>
        </div>
      </div>

      <div className="crm-show__body">
        <aside className="crm-show__rail">
          <div className="crm-show__entity">
            <Avatar
              size={42}
              icon={icon}
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                fontWeight: 700,
                flex: 'none',
              }}
            >
              {icon ? null : initials(title)}
            </Avatar>

            <div style={{ minWidth: 0 }}>
              <Title level={4} className="crm-show__entity-title">
                {title}
              </Title>

              <Text type="secondary" className="crm-show__entity-subtitle">
                {subtitle || 'CRM record'}
              </Text>

              <div className="crm-show__tags">{tags}</div>
            </div>
          </div>

          {amountLabel ? (
            <div className="crm-show__rail-section">
              <Text className="crm-show__rail-label">{amountLabel}</Text>
              <div className="crm-show__rail-amount">{amount}</div>
            </div>
          ) : null}

          <RailTable rows={railRows} />

          <div className="crm-show__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`crm-show__tab ${
                  activeTab === tab.key ? 'crm-show__tab--active' : ''
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined ? <span>{tab.count}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        <main className="crm-show__main">{active?.children}</main>
      </div>
    </>
  );
}

export function ContactShow({ auth, id }) {
  return (
    <ShowShell
      auth={auth}
      id={id}
      endpoint="/api/contacts/"
      mapRecord={(record) => ({ title: displayName(record) })}
    >
      {(contact) => {
        const title = displayName(contact);

        const overview = (
          <>
            <DetailsCard title="Overview">
              <InfoTable
                rows={[
                  { label: 'Name', value: contact?.name },
                  { label: 'Code', value: contact?.code },
                  { label: 'Type', value: <SmartTag value={contact?.contact_type} /> },
                  {
                    label: 'Group',
                    value: contact?.contact_group?.name || contact?.contactGroup?.name,
                  },
                  { label: 'Phone', value: contact?.phone },
                  { label: 'Email', value: contact?.email },
                  { label: 'PAN', value: contact?.pan },
                  { label: 'Tax Reg No', value: contact?.tax_registration_no },
                  { label: 'Credit Term', value: contact?.credit_term?.name || contact?.creditTerm?.name },
                  { label: 'Credit Limit', value: formatMoney(contact?.credit_limit) },
                  { label: 'Accept Purchase', value: contact?.accept_purchase ? 'Yes' : 'No' },
                  { label: 'Account', value: contact?.account?.name || contact?.account?.code },
                ]}
              />
            </DetailsCard>

            <DetailsCard title="Address">
              <Paragraph style={{ margin: 0 }}>
                <Value value={contact?.address} />
              </Paragraph>
            </DetailsCard>
          </>
        );

        const tabs = [
          {
            key: 'overview',
            label: 'Overview',
            children: overview,
          },
          {
            key: 'activities',
            label: 'Activities',
            children: (
              <RelatedTable
                title="Activities"
                endpoint="/api/crm-activities/"
                params={{ contact_id: id }}
                columns={activityColumns}
                rowUrl={(row) =>
                  safeRoute('crm.activities.show', row.id, `/crm/activities/${row.id}`)
                }
              />
            ),
          },
          {
            key: 'leads',
            label: 'Leads',
            children: (
              <RelatedTable
                title="Leads"
                endpoint="/api/leads/"
                params={{ contact_id: id }}
                columns={leadColumns}
                rowUrl={(row) =>
                  safeRoute('crm.leads.show', row.id, `/crm/leads/${row.id}`)
                }
              />
            ),
          },
          {
            key: 'invoices',
            label: 'Invoices',
            children: (
              <RelatedTable
                title="Invoices"
                endpoint="/api/invoices/"
                params={{ contact_id: id }}
                columns={documentColumns('invoice_no', 'invoice_date', 'grand_total')}
              />
            ),
          },
          {
            key: 'purchase_bills',
            label: 'Purchase Bills',
            children: (
              <RelatedTable
                title="Purchase Bills"
                endpoint="/api/purchase-bills/"
                params={{ contact_id: id }}
                columns={documentColumns('bill_no', 'bill_date', 'grand_total')}
              />
            ),
          },
        ];

        return (
          <RecordLayout
            record={contact}
            title={title}
            subtitle={[contact?.code, contact?.email, contact?.phone].filter(Boolean).join(' | ')}
            icon={<ContactsOutlined />}
            tags={
              <>
                <SmartTag value={contact?.contact_type} />
                <SmartTag value={contact?.active === false ? 'inactive' : 'active'} />
              </>
            }
            backLabel="Contacts"
            backUrl={safeRoute('crm.contacts.index', null, '/crm/contacts')}
            amountLabel="Credit Limit"
            amount={formatMoney(contact?.credit_limit)}
            railRows={[
              { label: 'Type', value: <SmartTag value={contact?.contact_type} /> },
              { label: 'Phone', value: contact?.phone },
              { label: 'Email', value: contact?.email },
              { label: 'Created', value: formatDateTime(contact?.created_at) },
              { label: 'Updated', value: formatDateTime(contact?.updated_at) },
            ]}
            tabs={tabs}
          />
        );
      }}
    </ShowShell>
  );
}

export function LeadShow({ auth, id }) {
  return (
    <ShowShell
      auth={auth}
      id={id}
      endpoint="/api/leads/"
      mapRecord={(record) => ({ title: displayName(record) })}
    >
      {(lead) => {
        const title = displayName(lead);

        const overview = (
          <>
            <DetailsCard title="Overview">
              <InfoTable
                rows={[
                  { label: 'Lead No', value: lead?.lead_no },
                  { label: 'Name', value: lead?.name },
                  { label: 'Company', value: lead?.company_name },
                  { label: 'Status', value: <SmartTag value={lead?.status || 'new'} /> },
                  { label: 'Priority', value: <SmartTag value={lead?.priority || 'medium'} /> },
                  { label: 'Source', value: lead?.lead_source },
                  { label: 'Industry', value: lead?.industry },
                  { label: 'Expected Value', value: formatMoney(lead?.expected_value) },
                  { label: 'Assigned To', value: lead?.assigned_to?.name || lead?.assignedTo?.name },
                  { label: 'Contact', value: lead?.contact?.name },
                  { label: 'Next Follow Up', value: formatDateTime(lead?.next_follow_up_date) },
                  { label: 'Last Contacted', value: formatDateTime(lead?.last_contacted_at) },
                ]}
              />
            </DetailsCard>

            <Row gutter={[10, 10]}>
              <Col xs={24} lg={12}>
                <DetailsCard title="Communication">
                  <Space direction="vertical" size={6}>
                    <Text>
                      <MailOutlined /> <Value value={lead?.email} />
                    </Text>
                    <Text>
                      <PhoneOutlined /> <Value value={lead?.phone || lead?.mobile} />
                    </Text>
                    <Text>
                      <CalendarOutlined /> <Value value={lead?.website} />
                    </Text>
                  </Space>
                </DetailsCard>
              </Col>

              <Col xs={24} lg={12}>
                <DetailsCard title="Notes">
                  <Paragraph style={{ margin: 0 }}>
                    <Value value={lead?.notes} />
                  </Paragraph>
                </DetailsCard>
              </Col>
            </Row>
          </>
        );

        const tabs = [
          {
            key: 'overview',
            label: 'Overview',
            children: overview,
          },
          {
            key: 'activities',
            label: 'Activities',
            children: (
              <RelatedTable
                title="Activities"
                endpoint="/api/crm-activities/"
                params={{ lead_id: id }}
                columns={activityColumns}
                rowUrl={(row) =>
                  safeRoute('crm.activities.show', row.id, `/crm/activities/${row.id}`)
                }
              />
            ),
          },
          {
            key: 'deals',
            label: 'Deals',
            children: (
              <RelatedTable
                title="Deals"
                endpoint="/api/deals/"
                params={{ lead_id: id }}
                columns={dealColumns}
              />
            ),
          },
        ];

        return (
          <RecordLayout
            record={lead}
            title={title}
            subtitle={[lead?.lead_no, lead?.company_name, lead?.email].filter(Boolean).join(' | ')}
            icon={<UserSwitchOutlined />}
            tags={
              <>
                <SmartTag value={lead?.status || 'new'} />
                <SmartTag value={lead?.priority || 'medium'} />
                <SmartTag value={lead?.active === false ? 'inactive' : 'active'} />
              </>
            }
            backLabel="Leads"
            backUrl={safeRoute('crm.leads.index', null, '/crm/leads')}
            amountLabel="Expected Value"
            amount={formatMoney(lead?.expected_value)}
            railRows={[
              { label: 'Status', value: <SmartTag value={lead?.status || 'new'} /> },
              { label: 'Priority', value: <SmartTag value={lead?.priority || 'medium'} /> },
              { label: 'Phone', value: lead?.phone || lead?.mobile },
              { label: 'Email', value: lead?.email },
              { label: 'Created', value: formatDateTime(lead?.created_at) },
              { label: 'Updated', value: formatDateTime(lead?.updated_at) },
            ]}
            tabs={tabs}
          />
        );
      }}
    </ShowShell>
  );
}

export function ActivityShow({ auth, id }) {
  return (
    <ShowShell
      auth={auth}
      id={id}
      endpoint="/api/crm-activities/"
      mapRecord={(record) => ({ title: record?.subject || 'Activity' })}
    >
      {(activity) => {
        const comments =
          activity?.crm_activity_comments ||
          activity?.crmActivityComments ||
          [];

        const overview = (
          <>
            <DetailsCard title="Overview">
              <InfoTable
                rows={[
                  { label: 'Type', value: <SmartTag value={activity?.activity_type} /> },
                  { label: 'Status', value: <SmartTag value={activity?.status || 'pending'} /> },
                  { label: 'Priority', value: <SmartTag value={activity?.priority || 'medium'} /> },
                  { label: 'Assigned To', value: activity?.assigned_to?.name || activity?.assignedTo?.name },
                  { label: 'Lead', value: activity?.lead?.name },
                  { label: 'Contact', value: activity?.contact?.name },
                  { label: 'Deal', value: activity?.deal?.title || activity?.deal?.name },
                  { label: 'Due At', value: formatDateTime(activity?.due_at) },
                  { label: 'Completed At', value: formatDateTime(activity?.completed_at) },
                  { label: 'Reminder At', value: formatDateTime(activity?.reminder_at) },
                  { label: 'Next Follow Up', value: formatDateTime(activity?.next_follow_up_at) },
                  { label: 'Outcome', value: activity?.outcome },
                ]}
              />
            </DetailsCard>

            <DetailsCard title="Description">
              <Paragraph style={{ margin: 0 }}>
                <Value value={activity?.description} />
              </Paragraph>
            </DetailsCard>
          </>
        );

        const commentsContent = (
          <DetailsCard title="Comments">
            {comments.length ? (
              <Timeline
                items={comments.map((comment) => ({
                  children: (
                    <Space direction="vertical" size={2}>
                      <Text>{comment?.comment}</Text>
                      <Text type="secondary">
                        {comment?.user?.name || 'User'} | {formatDateTime(comment?.created_at)}
                      </Text>
                    </Space>
                  ),
                }))}
              />
            ) : (
              <Empty description="No comments yet" />
            )}
          </DetailsCard>
        );

        const linkedContent = (
          <Row gutter={[10, 10]}>
            {activity?.lead?.id ? (
              <Col xs={24} lg={12}>
                <DetailsCard
                  title="Linked Lead"
                  extra={
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        router.visit(
                          safeRoute(
                            'crm.leads.show',
                            activity.lead.id,
                            `/crm/leads/${activity.lead.id}`
                          )
                        )
                      }
                    >
                      Open
                    </Button>
                  }
                >
                  <Text strong>{activity.lead.name}</Text>
                  <br />
                  <Text type="secondary">
                    {activity.lead.company_name || activity.lead.email || '-'}
                  </Text>
                </DetailsCard>
              </Col>
            ) : null}

            {activity?.contact?.id ? (
              <Col xs={24} lg={12}>
                <DetailsCard
                  title="Linked Contact"
                  extra={
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        router.visit(
                          safeRoute(
                            'crm.contacts.show',
                            activity.contact.id,
                            `/crm/contacts/${activity.contact.id}`
                          )
                        )
                      }
                    >
                      Open
                    </Button>
                  }
                >
                  <Text strong>{activity.contact.name}</Text>
                  <br />
                  <Text type="secondary">
                    {activity.contact.email || activity.contact.phone || '-'}
                  </Text>
                </DetailsCard>
              </Col>
            ) : null}

            {!activity?.lead?.id && !activity?.contact?.id ? (
              <Col span={24}>
                <DetailsCard title="Linked Records">
                  <Empty description="No linked records" />
                </DetailsCard>
              </Col>
            ) : null}
          </Row>
        );

        const tabs = [
          {
            key: 'overview',
            label: 'Overview',
            children: overview,
          },
          {
            key: 'comments',
            label: 'Comments',
            count: comments.length,
            children: commentsContent,
          },
          {
            key: 'linked',
            label: 'Linked Records',
            children: linkedContent,
          },
        ];

        return (
          <RecordLayout
            record={activity}
            title={activity?.subject || 'Activity'}
            subtitle={
              [labelize(activity?.activity_type), activity?.outcome]
                .filter(Boolean)
                .join(' | ') || 'CRM activity'
            }
            icon={<ScheduleOutlined />}
            tags={
              <>
                <SmartTag value={activity?.status || 'pending'} />
                <SmartTag value={activity?.priority || 'medium'} />
                <SmartTag value={activity?.active === false ? 'inactive' : 'active'} />
              </>
            }
            backLabel="Activities"
            backUrl={safeRoute('crm.activities.index', null, '/crm/activities')}
            amountLabel="Due Date"
            amount={formatDateTime(activity?.due_at)}
            railRows={[
              { label: 'Type', value: <SmartTag value={activity?.activity_type} /> },
              { label: 'Status', value: <SmartTag value={activity?.status || 'pending'} /> },
              { label: 'Priority', value: <SmartTag value={activity?.priority || 'medium'} /> },
              { label: 'Created', value: formatDateTime(activity?.created_at) },
              { label: 'Updated', value: formatDateTime(activity?.updated_at) },
            ]}
            tabs={tabs}
          />
        );
      }}
    </ShowShell>
  );
}