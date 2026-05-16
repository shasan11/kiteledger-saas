import React, { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  ContactsOutlined,
  FileTextOutlined,
  FundOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ScheduleOutlined,
  UserSwitchOutlined,
  DollarCircleOutlined,
  ClockCircleOutlined,
  ApartmentOutlined,
  NumberOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ReusableCrud from '@/Components/ReusableCrud';
import SendEmail from '@/Components/SendEmail';
import {
  buildActivityCrud,
  buildDealCrud,
  buildLeadCrud,
} from '@/Pages/App/Crm/Shared/crmCrudConfigs';

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
  open: 'blue',
  won: 'green',
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

  return (
    <Tag color={statusColor[value] || 'default'} className="crm-show__tag">
      {labelize(value)}
    </Tag>
  );
}

function InfoTable({ rows = [], columns = 2 }) {
  const validRows = rows.filter(Boolean);
  const groupedRows = [];

  for (let i = 0; i < validRows.length; i += columns) {
    groupedRows.push(validRows.slice(i, i + columns));
  }

  if (!validRows.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No details available" />;
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
  const validRows = rows.filter(Boolean);

  if (!validRows.length) return null;

  return (
    <div className="crm-show__rail-table-wrap">
      {validRows.map((row) => (
        <div className="crm-show__rail-row" key={row.label}>
          <Text type="secondary">{row.label}</Text>
          <div>{row.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

function DetailsCard({ title, extra, children }) {
  return (
    <Card className="crm-show__card" title={title} extra={extra}>
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
        rowClassName={(_, index) => (index % 2 === 0 ? 'crm-show__table-row' : 'crm-show__table-row is-alt')}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />,
        }}
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

const transactionRouteBySource = {
  CustomerPayment: ['sales.customer-payments.show', '/sales/customer-payments'],
  DebitNote: ['payment-out.debit-notes.show', '/payment-out/debit-notes'],
  Expense: ['payment-out.expenses.show', '/payment-out/expenses'],
  Invoice: ['sales.invoices.show', '/sales/invoices'],
  JournalVoucher: ['accounting.journal-vouchers.show', '/accounting/journal-vouchers'],
  PurchaseBill: ['payment-out.purchase-bills.show', '/payment-out/purchase-bills'],
  SalesReturn: ['sales.sales-returns.show', '/sales/sales-returns'],
  SupplierPayment: ['payment-out.supplier-payments.show', '/payment-out/supplier-payments'],
};

const transactionUrl = (row) => {
  const source =
    row?.source_type && row?.source_id
      ? transactionRouteBySource[row.source_type]
      : null;

  if (source) {
    return safeRoute(source[0], row.source_id, `${source[1]}/${row.source_id}`);
  }

  if (row?.journal_voucher_id) {
    return safeRoute(
      'accounting.journal-vouchers.show',
      row.journal_voucher_id,
      `/accounting/journal-vouchers/${row.journal_voucher_id}`
    );
  }

  return null;
};

function RecentTransactions({ rows = [] }) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <DetailsCard title="Recent Transactions">
      <Table
        size="small"
        scroll={{ x: 980 }}
        dataSource={data}
        rowKey={(row, index) => row?.id || index}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        rowClassName={(_, index) => (index % 2 === 0 ? 'crm-show__table-row' : 'crm-show__table-row is-alt')}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent transactions" />,
        }}
        onRow={(record) => {
          const url = transactionUrl(record);

          return {
            onClick: () => {
              if (url) router.visit(url);
            },
            style: { cursor: url ? 'pointer' : 'default' },
          };
        }}
        columns={[
          {
            title: 'Transaction',
            dataIndex: 'voucher_no',
            key: 'voucher_no',
            width: 220,
            render: (value, row) => (
              <Space direction="vertical" size={0}>
                <Text strong className="crm-show__link-text">
                  {row?.source_no || value || '-'}
                </Text>
                <Text type="secondary">
                  {labelize(row?.source_type || 'journal_voucher')}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Date',
            dataIndex: 'voucher_date',
            key: 'voucher_date',
            width: 140,
            render: formatDate,
          },
          {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (value) => value || '-',
          },
          {
            title: 'Debit',
            dataIndex: 'debit',
            key: 'debit',
            width: 120,
            align: 'right',
            render: formatMoney,
          },
          {
            title: 'Credit',
            dataIndex: 'credit',
            key: 'credit',
            width: 120,
            align: 'right',
            render: formatMoney,
          },
          {
            title: 'Status',
            dataIndex: 'approval_status',
            key: 'approval_status',
            width: 140,
            render: (value) => (
              <Tag color={value === 'Approved' ? 'success' : 'warning'} className="crm-show__tag">
                {value || 'Not Approved'}
              </Tag>
            ),
          },
        ]}
      />
    </DetailsCard>
  );
}

function DealsTabContent({ lead, leadId, dealCrud, dealCrudColumns }) {
  const [view, setView] = useState('kanban');
  const [addingDeal, setAddingDeal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { token } = theme.useToken();

  return (
    <>
      <DetailsCard
        title="Deals"
        extra={
          <Space size={6}>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddingDeal(true)}>
              Add Deal
            </Button>
            <Space.Compact size="small">
              <Button
                icon={<UnorderedListOutlined />}
                type={view === 'list' ? 'primary' : 'default'}
                onClick={() => setView('list')}
              >
                List
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                type={view === 'kanban' ? 'primary' : 'default'}
                onClick={() => setView('kanban')}
              >
                Kanban
              </Button>
            </Space.Compact>
          </Space>
        }
      >
        {view === 'list' ? (
          <ReusableCrud
            title="Deals"
            apiUrl={dealCrud.apiUrl}
            columns={dealCrudColumns}
            fields={dealCrud.fields}
            validationSchema={dealCrud.validationSchema}
            crudInitialValues={dealCrud.crudInitialValues}
            transformPayload={dealCrud.transformPayload}
            baseFilters={{ lead_id: leadId }}
            form_ui="drawer"
            drawerWidth={1100}
            searchParam="search"
            pageParam="page"
            pageSizeParam="page_size"
            sortMode="ordering"
            orderingParam="ordering"
            enableServerPagination
            showSearch
            canAdd
            canEdit
            canDelete
            hasActions
            hasActionColumns
          />
        ) : (
          <DealKanban key={`lead-deals-kanban-${refreshKey}`} leadId={leadId} tokenColors={token} />
        )}
      </DetailsCard>

      {addingDeal ? (
        <div style={{ display: 'none' }}>
          <ReusableCrud
            key={`lead-deal-add-${refreshKey}`}
            title="Deals"
            apiUrl={dealCrud.apiUrl}
            columns={dealCrudColumns}
            fields={dealCrud.fields}
            validationSchema={dealCrud.validationSchema}
            crudInitialValues={{
              ...dealCrud.crudInitialValues,
              lead_id: leadId,
              contact_id: lead?.contact_id || null,
              deal_pipeline_id: lead?.deal_pipeline_id || null,
              assigned_to_id: lead?.assigned_to_id || null,
              title: lead?.name || lead?.company_name || '',
              amount: lead?.expected_value || null,
              source: lead?.lead_source || '',
            }}
            transformPayload={dealCrud.transformPayload}
            baseFilters={{ lead_id: leadId }}
            form_ui="modal"
            modalWidth={860}
            enableServerPagination={false}
            showSearch={false}
            canAdd
            canEdit={false}
            canDelete={false}
            hasActions={false}
            hasActionColumns={false}
            openOnMount
            openMode="add"
            submitLabelOverride="Create Deal"
            onFormClose={() => setAddingDeal(false)}
            onAddSuccess={() => {
              setAddingDeal(false);
              setView('kanban');
              setRefreshKey((key) => key + 1);
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function DealKanban({ leadId, tokenColors }) {
  const [stages, setStages] = useState([]);
  const [dealsByStage, setDealsByStage] = useState({});
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  const load = useMemo(() => async () => {
    setLoading(true);

    try {
      const [stagesRes, dealsRes] = await Promise.all([
        axios.get(api('/api/deal-stages/'), {
          headers: authHeaders(),
          params: { page_size: 100, ordering: 'sort_order' },
        }),
        axios.get(api('/api/deals/'), {
          headers: authHeaders(),
          params: { lead_id: leadId, page_size: 200 },
        }),
      ]);

      const stageRows = rowsFrom(stagesRes.data);
      const dealRows = rowsFrom(dealsRes.data);

      setStages(stageRows);

      const grouped = stageRows.reduce((acc, stage) => {
        acc[stage.id] = [];
        return acc;
      }, { __unassigned: [] });

      dealRows.forEach((deal) => {
        const key =
          deal.deal_stage_id && grouped[deal.deal_stage_id]
            ? deal.deal_stage_id
            : '__unassigned';

        grouped[key].push(deal);
      });

      setDealsByStage(grouped);
    } catch (error) {
      setStages([]);
      setDealsByStage({});
      messageApi.error(error?.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    let mounted = true;

    load();

    return () => {
      mounted = false;
    };
  }, [load]);

  const moveDeal = async (dealId, stageId) => {
    if (stageId === '__unassigned') return;

    const previous = dealsByStage;
    const allDeals = Object.values(dealsByStage).flat();
    const deal = allDeals.find((item) => item.id === dealId);
    if (!deal || deal.deal_stage_id === stageId) return;

    setDealsByStage((current) => {
      const next = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value.filter((item) => item.id !== dealId)]));
      next[stageId] = [...(next[stageId] || []), { ...deal, deal_stage_id: stageId }];
      return next;
    });

    try {
      await axios.post(api(`/api/deals/${dealId}/move-stage`), { deal_stage_id: stageId }, { headers: authHeaders() });
      messageApi.success('Deal moved');
      load();
    } catch (error) {
      setDealsByStage(previous);
      messageApi.error(error?.response?.data?.message || 'Could not move deal');
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;

  const columns = [
    ...stages,
    { id: '__unassigned', name: 'Unassigned', color: tokenColors.colorTextSecondary },
  ];

  return (
    <div className="crm-show__kanban">
      {contextHolder}
      {columns.map((stage) => {
        const items = dealsByStage[stage.id] || [];
        const total = items.reduce((sum, deal) => sum + Number(deal.amount || 0), 0);

        return (
          <div
            className="crm-show__kanban-column"
            key={stage.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dealId = event.dataTransfer.getData('dealId');
              if (dealId) moveDeal(dealId, stage.id);
            }}
          >
            <div className="crm-show__kanban-head">
              <Space size={8}>
                <span
                  className="crm-show__kanban-dot"
                  style={{ background: stage.color || tokenColors.colorPrimary }}
                />
                <Text strong>{stage.name}</Text>
              </Space>

              <Tag className="crm-show__tag">{items.length}</Tag>
            </div>

            <div className="crm-show__kanban-total">
              Total: <strong>{formatMoney(total)}</strong>
            </div>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {items.length ? (
                items.map((deal) => (
                  <Card
                    key={deal.id}
                    size="small"
                    hoverable
                    className="crm-show__kanban-card"
                    onClick={() =>
                      router.visit(safeRoute('crm.deals.show', deal.id, `/crm/deals/${deal.id}`))
                    }
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('dealId', deal.id)}
                  >
                    <Text strong className="crm-show__kanban-title">
                      {deal.title || deal.deal_no || '-'}
                    </Text>

                    <Text type="secondary" className="crm-show__kanban-money">
                      {formatMoney(deal.amount)}
                    </Text>

                    <div style={{ marginTop: 6 }}>
                      <SmartTag value={deal.status || 'open'} />
                    </div>
                  </Card>
                ))
              ) : (
                <div className="crm-show__kanban-empty">
                  <Text type="secondary">No deals</Text>
                </div>
              )}
            </Space>
          </div>
        );
      })}
    </div>
  );
}

function LeadCommentsTab({ leadId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const res = await axios.get(api('/api/crm-activities/'), {
          headers: authHeaders(),
          params: { lead_id: leadId, page_size: 200 },
        });

        if (!mounted) return;

        const acts = rowsFrom(res.data);
        const all = [];

        acts.forEach((act) => {
          const raw = act.crm_activity_comments || act.crmActivityComments || [];
          raw.forEach((comment) =>
            all.push({
              ...comment,
              activity_subject: act.subject,
              activity_id: act.id,
            })
          );
        });

        all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setComments(all);
      } catch {
        if (mounted) setComments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [leadId]);

  return (
    <DetailsCard title="Comments">
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : comments.length ? (
        <Timeline
          className="crm-show__timeline"
          items={comments.map((comment) => ({
            children: (
              <Space direction="vertical" size={2}>
                <Text>{comment?.comment}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {(comment?.user?.name || 'User')} on "{comment.activity_subject || 'Activity'}" |{' '}
                  {formatDateTime(comment?.created_at)}
                </Text>
              </Space>
            ),
          }))}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No comments yet. Add comments to activities to see them here."
        />
      )}
    </DetailsCard>
  );
}

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

  const uiVars = {
    '--crm-bg': token.colorBgLayout,
    '--crm-surface': token.colorBgContainer,
    '--crm-elevated': token.colorBgElevated,
    '--crm-soft': token.colorFillAlter,
    '--crm-muted': token.colorFillQuaternary,
    '--crm-border': token.colorBorderSecondary,
    '--crm-border-strong': token.colorBorder,
    '--crm-text': token.colorText,
    '--crm-text-secondary': token.colorTextSecondary,
    '--crm-text-tertiary': token.colorTextTertiary,
    '--crm-primary': token.colorPrimary,
    '--crm-primary-bg': token.colorPrimaryBg,
    '--crm-primary-border': token.colorPrimaryBorder,
    '--crm-success': token.colorSuccess,
    '--crm-success-bg': token.colorSuccessBg,
    '--crm-warning': token.colorWarning,
    '--crm-warning-bg': token.colorWarningBg,
    '--crm-error': token.colorError,
    '--crm-radius': `${token.borderRadiusLG}px`,
    '--crm-radius-sm': `${token.borderRadius}px`,
    '--crm-padding': `${token.padding}px`,
    '--crm-padding-lg': `${token.paddingLG}px`,
    '--crm-padding-sm': `${token.paddingSM}px`,
    '--crm-padding-xs': `${token.paddingXS}px`,
    '--crm-font-sm': `${token.fontSizeSM}px`,
    '--crm-font': `${token.fontSize}px`,
    '--crm-font-lg': `${token.fontSizeLG}px`,
    '--crm-shadow': token.boxShadowTertiary,
  };

  return (
    <AuthenticatedLayout user={auth?.user}>
      {contextHolder}
      <Head title={title} />

      <style>{`
        .crm-show {
          min-height: calc(100vh - 64px);
          background: var(--crm-bg);
          color: var(--crm-text);
          padding: var(--crm-padding);
        }

        .crm-show__shell {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding);
        }

        .crm-show__bar-card.ant-card,
        .crm-show__rail-card.ant-card,
        .crm-show__card.ant-card,
        .crm-show__metric-card.ant-card {
          border-color: var(--crm-border);
          border-radius: var(--crm-radius);
          box-shadow: var(--crm-shadow);
          overflow: hidden;
        }

        .crm-show__bar-card .ant-card-body {
          padding: var(--crm-padding-sm) var(--crm-padding);
        }

        .crm-show__bar {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--crm-padding);
        }

        .crm-show__crumb {
          display: flex;
          align-items: center;
          gap: var(--crm-padding-sm);
          min-width: 0;
        }

        .crm-show__crumb-title {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__crumb-title h4 {
          margin: 0 !important;
          line-height: 1.2 !important;
        }

        .crm-show__body {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: var(--crm-padding);
          align-items: start;
        }

        .crm-show__rail {
          position: sticky;
          top: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__rail-card .ant-card-body {
          padding: var(--crm-padding);
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding-sm);
        }

        .crm-show__entity {
          display: flex;
          align-items: flex-start;
          gap: var(--crm-padding-sm);
          padding-bottom: var(--crm-padding-sm);
          border-bottom: 1px solid var(--crm-border);
        }

        .crm-show__entity-title {
          margin: 0 !important;
          font-size: 18px !important;
          line-height: 1.25 !important;
          color: var(--crm-text);
          word-break: break-word;
        }

        .crm-show__entity-subtitle {
          display: block;
          font-size: var(--crm-font-sm);
          margin-top: 3px;
        }

        .crm-show__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
        }

        .crm-show__tag {
          margin-inline-end: 0 !important;
          font-size: 11px;
          line-height: 18px;
          padding-inline: 7px;
          border-radius: 999px;
        }

        .crm-show__metric-card .ant-card-body {
          padding: var(--crm-padding-sm);
        }

        .crm-show__metric {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .crm-show__metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--crm-primary);
          background: var(--crm-primary-bg);
          flex: none;
          font-size: 17px;
        }

        .crm-show__metric-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__metric-content strong {
          font-size: 20px;
          line-height: 1.2;
          color: var(--crm-text);
          word-break: break-word;
        }

        .crm-show__rail-table-wrap {
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
          background: var(--crm-surface);
        }

        .crm-show__rail-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          border-bottom: 1px solid var(--crm-border);
        }

        .crm-show__rail-row:last-child {
          border-bottom: 0;
        }

        .crm-show__rail-row > span,
        .crm-show__rail-row > div {
          padding: 8px 10px;
          font-size: var(--crm-font-sm);
          line-height: 1.35;
          word-break: break-word;
        }

        .crm-show__rail-row > span {
          background: var(--crm-muted);
          border-right: 1px solid var(--crm-border);
          font-weight: 600;
        }

        .crm-show__tabs {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 2px;
        }

        .crm-show__tab {
          width: 100%;
          min-height: 38px;
          border: 1px solid transparent;
          border-radius: var(--crm-radius-sm);
          background: transparent;
          color: var(--crm-text-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 11px;
          cursor: pointer;
          font-size: var(--crm-font-sm);
          font-weight: 700;
          text-align: left;
          transition: 0.16s ease;
        }

        .crm-show__tab:hover {
          background: var(--crm-muted);
          color: var(--crm-text);
        }

        .crm-show__tab--active {
          background: var(--crm-primary-bg);
          color: var(--crm-primary);
          border-color: var(--crm-primary-border);
        }

        .crm-show__tab-count {
          min-width: 22px;
          height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: var(--crm-surface);
          border: 1px solid var(--crm-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .crm-show__main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--crm-padding);
          overflow: hidden;
        }

        .crm-show__card.ant-card {
          background: var(--crm-surface);
        }

        .crm-show__card .ant-card-head {
          min-height: 46px;
          padding: 0 var(--crm-padding);
          border-bottom: 1px solid var(--crm-border);
          background: var(--crm-elevated);
        }

        .crm-show__card .ant-card-head-title {
          font-size: var(--crm-font);
          font-weight: 800;
          color: var(--crm-text);
        }

        .crm-show__card .ant-card-body {
          padding: var(--crm-padding);
          min-width: 0;
        }

        .crm-show__info-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: var(--crm-font-sm);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
        }

        .crm-show__info-table th {
          width: 15%;
          padding: 9px 11px;
          background: var(--crm-muted);
          border-right: 1px solid var(--crm-border);
          border-bottom: 1px solid var(--crm-border);
          color: var(--crm-text-secondary);
          font-weight: 700;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .crm-show__info-table td {
          width: 35%;
          padding: 9px 11px;
          background: var(--crm-surface);
          border-right: 1px solid var(--crm-border);
          border-bottom: 1px solid var(--crm-border);
          color: var(--crm-text);
          vertical-align: top;
          word-break: break-word;
        }

        .crm-show__info-table tr:last-child th,
        .crm-show__info-table tr:last-child td {
          border-bottom: 0;
        }

        .crm-show__info-table th:last-child,
        .crm-show__info-table td:last-child {
          border-right: 0;
        }

        .crm-show .ant-table {
          font-size: var(--crm-font-sm);
        }

        .crm-show .ant-table-wrapper .ant-table-container {
          border-radius: var(--crm-radius-sm);
          overflow: hidden;
        }

        .crm-show .ant-table-thead > tr > th {
          padding: 9px 11px !important;
          background: var(--crm-muted) !important;
          font-weight: 800;
          color: var(--crm-text-secondary) !important;
          border-color: var(--crm-border) !important;
          white-space: nowrap;
        }

        .crm-show .ant-table-tbody > tr > td {
          padding: 8px 11px !important;
          vertical-align: middle;
          border-color: var(--crm-border) !important;
        }

        .crm-show__table-row.is-alt > td {
          background: var(--crm-muted);
        }

        .crm-show__link-text {
          color: var(--crm-primary);
        }

        .crm-show__contact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--crm-padding-sm);
        }

        .crm-show__contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-muted);
          min-width: 0;
        }

        .crm-show__contact-icon {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--crm-primary);
          background: var(--crm-primary-bg);
          flex: none;
        }

        .crm-show__contact-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crm-show__contact-content span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crm-show__kanban {
          display: flex;
          gap: var(--crm-padding-sm);
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .crm-show__kanban-column {
          min-width: 260px;
          max-width: 290px;
          flex: 0 0 270px;
          background: var(--crm-muted);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          padding: var(--crm-padding-sm);
        }

        .crm-show__kanban-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .crm-show__kanban-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          display: inline-block;
        }

        .crm-show__kanban-total {
          font-size: 12px;
          color: var(--crm-text-secondary);
          margin-bottom: 10px;
        }

        .crm-show__kanban-card.ant-card {
          border-color: var(--crm-border);
          border-radius: var(--crm-radius-sm);
        }

        .crm-show__kanban-card .ant-card-body {
          padding: 10px;
        }

        .crm-show__kanban-title {
          display: block;
          margin-bottom: 2px;
        }

        .crm-show__kanban-money {
          font-size: 12px;
        }

        .crm-show__kanban-empty {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--crm-border);
          border-radius: var(--crm-radius-sm);
          background: var(--crm-surface);
        }

        .crm-show__timeline {
          padding-top: 6px;
        }

        .crm-show__state {
          padding: var(--crm-padding-lg);
          background: var(--crm-surface);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius);
          box-shadow: var(--crm-shadow);
        }

        @media (max-width: 1180px) {
          .crm-show__body {
            grid-template-columns: 1fr;
          }

          .crm-show__rail {
            position: static;
          }

          .crm-show__rail-card .ant-card-body {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
          }

          .crm-show__entity,
          .crm-show__metric-card,
          .crm-show__rail-table-wrap,
          .crm-show__tabs {
            grid-column: 1 / -1;
          }

          .crm-show__tabs {
            flex-direction: row;
            overflow-x: auto;
          }

          .crm-show__tab {
            width: auto;
            min-width: 128px;
            white-space: nowrap;
            flex: none;
          }
        }

        @media (max-width: 768px) {
          .crm-show {
            padding: var(--crm-padding-sm);
          }

          .crm-show__bar {
            align-items: stretch;
            flex-direction: column;
          }

          .crm-show__crumb {
            align-items: flex-start;
          }

          .crm-show__contact-grid {
            grid-template-columns: 1fr;
          }

          .crm-show__info-table {
            min-width: 760px;
          }

          .crm-show__card .ant-card-body {
            overflow-x: auto;
          }

          .crm-show__rail-row {
            grid-template-columns: 1fr;
          }

          .crm-show__rail-row > span {
            border-right: 0;
            border-bottom: 1px solid var(--crm-border);
          }
        }
      `}</style>

      <div className="crm-show" style={uiVars}>
        <div className="crm-show__shell">
          {error ? (
            <div className="crm-show__state">
              <Alert type="error" message={error} showIcon />
            </div>
          ) : null}

          {loading ? (
            <div className="crm-show__state">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ) : null}

          {!loading && !record && !error ? (
            <div className="crm-show__state">
              <Empty description="Record not found" />
            </div>
          ) : null}

          {!loading && record ? children(record) : null}
        </div>
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
  amountIcon,
  railRows,
  tabs,
}) {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.key || 'overview');

  return (
    <>
      <Card className="crm-show__bar-card">
        <div className="crm-show__bar">
          <div className="crm-show__crumb">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.visit(backUrl)}
            >
              {backLabel}
            </Button>

            <div className="crm-show__crumb-title">
              <Title level={4}>{title}</Title>
              <Text type="secondary" ellipsis style={{ maxWidth: 720 }}>
                {subtitle || 'CRM record'}
              </Text>
            </div>
          </div>

          <Space wrap>{tags}</Space>
        </div>
      </Card>

      <div className="crm-show__body">
        <aside className="crm-show__rail">
          <Card className="crm-show__rail-card">
            <div className="crm-show__entity">
              <Avatar
                size={48}
                icon={icon}
                style={{
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  fontWeight: 800,
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
              <Card className="crm-show__metric-card">
                <div className="crm-show__metric">
                  <div className="crm-show__metric-icon">
                    {amountIcon || <DollarCircleOutlined />}
                  </div>

                  <div className="crm-show__metric-content">
                    <Text type="secondary">{amountLabel}</Text>
                    <strong>{amount}</strong>
                  </div>
                </div>
              </Card>
            ) : null}

            <RailTable rows={railRows} />

          </Card>
        </aside>

        <main className="crm-show__main">
          <Card className="crm-show__card">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabs.map((tab) => ({
                key: tab.key,
                label: tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label,
                children: tab.children,
              }))}
            />
          </Card>
        </main>
      </div>
    </>
  );
}

function ContactBlocks({ contact }) {
  return (
    <div className="crm-show__contact-grid">
      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <PhoneOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Phone</Text>
          <Text strong>
            <Value value={contact?.phone} />
          </Text>
        </div>
      </div>

      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <MailOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Email</Text>
          <Text strong>
            <Value value={contact?.email} />
          </Text>
        </div>
      </div>

      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <NumberOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Code</Text>
          <Text strong>
            <Value value={contact?.code} />
          </Text>
        </div>
      </div>
    </div>
  );
}

function LeadContactBlocks({ lead }) {
  return (
    <div className="crm-show__contact-grid">
      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <MailOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Email</Text>
          <Text strong>
            <Value value={lead?.email} />
          </Text>
        </div>
      </div>

      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <PhoneOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Phone</Text>
          <Text strong>
            <Value value={lead?.phone || lead?.mobile} />
          </Text>
        </div>
      </div>

      <div className="crm-show__contact-item">
        <div className="crm-show__contact-icon">
          <ApartmentOutlined />
        </div>
        <div className="crm-show__contact-content">
          <Text type="secondary">Website</Text>
          <Text strong>
            <Value value={lead?.website} />
          </Text>
        </div>
      </div>
    </div>
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
            <DetailsCard
              title="Overview"
              extra={
                <SendEmail
                  defaultValues={{
                    sender_email: auth?.user?.email || '',
                    receiver_email: contact?.email || '',
                    subject: contact?.name ? `Message for ${contact.name}` : '',
                  }}
                  disabled={!contact?.email}
                />
              }
            >
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <ContactBlocks contact={contact} />

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
                    {
                      label: 'Credit Term',
                      value: contact?.credit_term?.name || contact?.creditTerm?.name,
                    },
                    { label: 'Credit Limit', value: formatMoney(contact?.credit_limit) },
                    { label: 'Accept Purchase', value: contact?.accept_purchase ? 'Yes' : 'No' },
                    { label: 'Account', value: contact?.account?.name || contact?.account?.code },
                  ]}
                />
              </Space>
            </DetailsCard>

            <DetailsCard title="Address">
              <Paragraph style={{ margin: 0 }}>
                <Value value={contact?.address} />
              </Paragraph>
            </DetailsCard>

            <RecentTransactions rows={contact?.recent_transactions} />
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
            amountIcon={<DollarCircleOutlined />}
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
  const [convertDrawer, setConvertDrawer] = useState(false);
  const [markLostModal, setMarkLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [activityDrawer, setActivityDrawer] = useState(false);
  const [editDrawer, setEditDrawer] = useState(false);
  const [shellRefresh, setShellRefresh] = useState(0);
  const [messageApi, ctx] = message.useMessage();

  const doMarkStatus = async (status, reason = null) => {
    try {
      const payload = { status };
      if (reason) payload.lost_reason = reason;
      await axios.patch(`${BACKEND_BASE}/api/leads/${id}`, payload, { headers: authHeaders() });
      messageApi.success(`Lead marked ${status}`);
      setShellRefresh((k) => k + 1);
    } catch {
      messageApi.error('Failed to update status');
    }
  };

  const doMarkLost = async () => {
    if (!lostReason.trim()) { messageApi.warning('Lost reason required'); return; }
    try {
      await axios.post(`${BACKEND_BASE}/api/crm/leads/${id}/mark-lost`, { lost_reason: lostReason }, { headers: authHeaders() });
      messageApi.success('Lead marked lost');
      setMarkLostModal(false);
      setLostReason('');
      setShellRefresh((k) => k + 1);
    } catch {
      messageApi.error('Failed to mark lost');
    }
  };

  const doConvert = async () => {
    try {
      await axios.post(`${BACKEND_BASE}/api/crm/leads/${id}/convert`, {}, { headers: authHeaders() });
      messageApi.success('Lead marked as converted');
      setConvertDrawer(false);
      setShellRefresh((k) => k + 1);
    } catch (e) {
      messageApi.error(e?.response?.data?.message || 'Conversion failed');
    }
  };

  return (
    <>
      {ctx}
      <ShowShell
        key={shellRefresh}
        auth={auth}
        id={id}
        endpoint="/api/leads/"
        mapRecord={(record) => ({ title: displayName(record) })}
      >
      {(lead) => {
        const title = displayName(lead);

        const actionButtons = (
          <Space wrap size={6}>
            {lead?.phone && (
              <Tooltip title={`Call ${lead.phone}`}>
                <Button size="small" icon={<PhoneOutlined />} onClick={() => window.location.href = `tel:${lead.phone}`} />
              </Tooltip>
            )}
            {lead?.email && (
              <Tooltip title={`Email ${lead.email}`}>
                <Button size="small" icon={<MailOutlined />} onClick={() => window.location.href = `mailto:${lead.email}`} />
              </Tooltip>
            )}
            <Button size="small" icon={<PlusOutlined />} onClick={() => setActivityDrawer(true)}>Activity</Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditDrawer(true)}>Edit Lead</Button>
            <Button size="small" icon={<CheckOutlined />} onClick={() => doMarkStatus('contacted')}>Contacted</Button>
            <Button size="small" icon={<CheckOutlined />} onClick={() => doMarkStatus('qualified')}>Qualify</Button>
            {lead?.status !== 'converted' && (
              <Button size="small" type="primary" icon={<FundOutlined />} onClick={() => setConvertDrawer(true)}>Convert to Deal</Button>
            )}
            {lead?.status !== 'lost' && (
              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => setMarkLostModal(true)}>Mark Lost</Button>
            )}
          </Space>
        );

        const overview = (
          <>
            <DetailsCard title="Overview" extra={actionButtons}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <LeadContactBlocks lead={lead} />

                <InfoTable
                  rows={[
                    { label: 'Lead No', value: lead?.lead_no },
                    { label: 'Name', value: lead?.name },
                    { label: 'Company', value: lead?.company_name },
                    { label: 'Status', value: <SmartTag value={lead?.status || 'new'} /> },
                    { label: 'Priority', value: <SmartTag value={lead?.priority || 'medium'} /> },
                    { label: 'Source', value: lead?.lead_source },
                    { label: 'Pipeline', value: lead?.deal_pipeline?.name || lead?.dealPipeline?.name },
                    { label: 'Expected Value', value: formatMoney(lead?.expected_value) },
                    {
                      label: 'Assigned To',
                      value: lead?.assigned_to?.name || lead?.assignedTo?.name,
                    },
                    { label: 'Contact', value: lead?.contact?.name },
                    { label: 'Next Follow Up', value: formatDateTime(lead?.next_follow_up_at || lead?.next_follow_up_date) },
                    { label: 'Last Contacted', value: formatDateTime(lead?.last_contacted_at) },
                    lead?.status === 'converted' && lead?.converted_deal
                      ? { label: 'Converted Deal', value: <Button type="link" size="small" style={{ padding: 0 }} onClick={() => router.visit(`/crm/deals/${lead.converted_deal.id}`)}>{lead.converted_deal.title}</Button> }
                      : null,
                    lead?.lost_reason ? { label: 'Lost Reason', value: lead.lost_reason } : null,
                  ].filter(Boolean)}
                />
              </Space>
            </DetailsCard>

            <Row gutter={[14, 14]}>
              <Col xs={24} lg={12}>
                <DetailsCard title="Communication">
                  <Space direction="vertical" size={8}>
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

        const activityCrud = buildActivityCrud({ locked: { lead_id: id } });
        const dealCrud = buildDealCrud({ locked: { lead_id: id } });

        const activityCrudColumns = [
          {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            sorter: true,
            render: (value) => <Text strong>{value || '-'}</Text>,
          },
          {
            title: 'Type',
            dataIndex: 'activity_type',
            key: 'activity_type',
            width: 110,
            render: (value) => (value ? <Tag className="crm-show__tag">{labelize(value)}</Tag> : '-'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (value) => <SmartTag value={value || 'pending'} />,
          },
          {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (value) => <SmartTag value={value || 'medium'} />,
          },
          {
            title: 'Due',
            dataIndex: 'due_at',
            key: 'due_at',
            width: 160,
            render: formatDateTime,
          },
        ];

        const dealCrudColumns = [
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            sorter: true,
            render: (value) => <Text strong>{value || '-'}</Text>,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (value) => <SmartTag value={value || 'open'} />,
          },
          {
            title: 'Stage',
            key: 'stage',
            width: 140,
            render: (_, record) => record?.deal_stage?.name || '-',
          },
          {
            title: 'Pipeline',
            key: 'pipeline',
            width: 140,
            render: (_, record) => record?.deal_pipeline?.name || '-',
          },
          {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 130,
            align: 'right',
            render: formatMoney,
          },
          {
            title: 'Expected Close',
            dataIndex: 'expected_close_date',
            key: 'expected_close_date',
            width: 140,
            render: (value) => value || '-',
          },
        ];

        const tabs = [
          { key: 'overview', label: 'Overview', children: overview },
          {
            key: 'activities',
            label: 'Activities',
            children: (
              <DetailsCard title="Activities">
                <ReusableCrud
                  title="Activities"
                  apiUrl={activityCrud.apiUrl}
                  columns={activityCrudColumns}
                  fields={activityCrud.fields}
                  validationSchema={activityCrud.validationSchema}
                  crudInitialValues={activityCrud.crudInitialValues}
                  transformPayload={activityCrud.transformPayload}
                  baseFilters={{ lead_id: id }}
                  form_ui="drawer"
                  drawerWidth={1100}
                  searchParam="search"
                  pageParam="page"
                  pageSizeParam="page_size"
                  sortMode="ordering"
                  orderingParam="ordering"
                  enableServerPagination
                  showSearch
                  canAdd
                  canEdit
                  canDelete
                  hasActions
                  hasActionColumns
                />
              </DetailsCard>
            ),
          },
          {
            key: 'deals',
            label: 'Deals',
            children: (
              <DealsTabContent
                lead={lead}
                leadId={id}
                dealCrud={dealCrud}
                dealCrudColumns={dealCrudColumns}
              />
            ),
          },
          {
            key: 'comments',
            label: 'Notes',
            children: <LeadCommentsTab leadId={id} />,
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
            amountIcon={<DollarCircleOutlined />}
            railRows={[
              { label: 'Status', value: <SmartTag value={lead?.status || 'new'} /> },
              { label: 'Priority', value: <SmartTag value={lead?.priority || 'medium'} /> },
              { label: 'Pipeline', value: lead?.deal_pipeline?.name || lead?.dealPipeline?.name },
              { label: 'Phone', value: lead?.phone || lead?.mobile },
              { label: 'Email', value: lead?.email },
              { label: 'Follow-up', value: formatDate(lead?.next_follow_up_at || lead?.next_follow_up_date) },
              { label: 'Created', value: formatDateTime(lead?.created_at) },
            ]}
            tabs={tabs}
          />
        );
      }}
    </ShowShell>

    {/* Edit lead modal */}
    {editDrawer && (
      <div style={{ display: 'none' }}>
        <ReusableCrud
          title="Leads"
          apiUrl={`${BACKEND_BASE}/api/leads/`}
          columns={[{ title: 'Lead', dataIndex: 'name', key: 'name' }]}
          fields={buildLeadCrud().fields}
          validationSchema={buildLeadCrud().validationSchema}
          crudInitialValues={buildLeadCrud().crudInitialValues}
          transformPayload={buildLeadCrud().transformPayload}
          form_ui="modal"
          modalWidth={900}
          enableServerPagination={false}
          showSearch={false}
          canAdd={false}
          canEdit
          canDelete={false}
          hasActions={false}
          hasActionColumns={false}
          openOnMount
          openMode="edit"
          openEditId={id}
          onFormClose={() => setEditDrawer(false)}
          onEditSuccess={() => {
            setEditDrawer(false);
            setShellRefresh((key) => key + 1);
          }}
        />
      </div>
    )}

    {/* Activity quick-add drawer */}
    {activityDrawer && (
      <Drawer title="Add Activity" open={activityDrawer} onClose={() => setActivityDrawer(false)} width={700}>
        <ReusableCrud
          title="Activities"
          apiUrl={`${BACKEND_BASE}/api/crm-activities/`}
          columns={[{ title: 'Subject', dataIndex: 'subject', key: 'subject' }]}
          fields={buildActivityCrud({ locked: { lead_id: id } }).fields}
          validationSchema={buildActivityCrud({ locked: { lead_id: id } }).validationSchema}
          crudInitialValues={buildActivityCrud({ locked: { lead_id: id } }).crudInitialValues}
          transformPayload={buildActivityCrud({ locked: { lead_id: id } }).transformPayload}
          baseFilters={{ lead_id: id }}
          form_ui="drawer"
          drawerWidth={700}
          enableServerPagination={false}
          showSearch={false}
          canAdd canEdit={false} canDelete={false} hasActions={false} hasActionColumns={false}
        />
      </Drawer>
    )}

    {/* Convert to Deal drawer */}
    {convertDrawer && (
      <Drawer title="Convert Lead to Deal" open={convertDrawer} onClose={() => setConvertDrawer(false)} width={700}>
        <ReusableCrud
          title="Create Deal from Lead"
          apiUrl={`${BACKEND_BASE}/api/deals/`}
          columns={[
            { title: 'Title', dataIndex: 'title', key: 'title' },
            { title: 'Stage', key: 'stage', render: (_, r) => r.deal_stage?.name || '-' },
          ]}
          fields={buildDealCrud({ locked: { lead_id: id } }).fields}
          validationSchema={buildDealCrud().validationSchema}
          crudInitialValues={{ ...buildDealCrud().crudInitialValues, lead_id: id }}
          transformPayload={buildDealCrud({ locked: { lead_id: id } }).transformPayload}
          baseFilters={{ lead_id: id }}
          form_ui="drawer"
          drawerWidth={700}
          enableServerPagination={false}
          showSearch={false}
          canAdd canEdit={false} canDelete={false} hasActions={false} hasActionColumns={false}
        />
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
          <Text type="secondary">After creating the deal above, mark this lead as converted:</Text>
          <div style={{ marginTop: 8 }}>
            <Button type="primary" onClick={doConvert}>Mark Lead as Converted</Button>
          </div>
        </div>
      </Drawer>
    )}

    {/* Mark Lost modal */}
    <Modal
      title="Mark Lead Lost"
      open={markLostModal}
      onOk={doMarkLost}
      onCancel={() => { setMarkLostModal(false); setLostReason(''); }}
      okText="Mark Lost"
      okButtonProps={{ danger: true }}
    >
      <Form layout="vertical">
        <Form.Item label="Lost Reason" required>
          <Input.TextArea rows={3} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why is this lead lost?" />
        </Form.Item>
      </Form>
    </Modal>
    </>
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
                  {
                    label: 'Assigned To',
                    value: activity?.assigned_to?.name || activity?.assignedTo?.name,
                  },
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
                className="crm-show__timeline"
                items={comments.map((comment) => ({
                  children: (
                    <Space direction="vertical" size={2}>
                      <Text>{comment?.comment}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {comment?.user?.name || 'User'} | {formatDateTime(comment?.created_at)}
                      </Text>
                    </Space>
                  ),
                }))}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet" />
            )}
          </DetailsCard>
        );

        const linkedContent = (
          <Row gutter={[14, 14]}>
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
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No linked records" />
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
            amountIcon={<ClockCircleOutlined />}
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
