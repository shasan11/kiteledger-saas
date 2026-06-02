import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { REPORT_CONFIG } from '../reportRegistry';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const NUMERIC_TOKENS = [
  'debit', 'credit', 'amount', 'total', 'balance', 'value', 'qty', 'stock',
  'paid', 'due', 'tax', 'discount', 'cost', 'salary', 'deduction', 'payable',
  'inflow', 'outflow', 'profit', 'revenue', 'expense', 'subtotal', 'price',
  'fee', 'rate', 'bonus', 'entitlement', 'sales', 'purchase', 'gross', 'net',
  'asset', 'liability', 'equity', 'opening', 'closing', 'running',
];

const STATUS_COLORS = {
  posted: 'green', approved: 'green', paid: 'green', active: 'green',
  healthy: 'green', 'in stock': 'green', 'approved leave': 'blue',
  draft: 'gold', pending: 'gold', 'part paid': 'orange', 'low stock': 'orange',
  watch: 'orange', late: 'orange', early_out: 'orange',
  void: 'red', cancelled: 'red', inactive: 'default', 'out of stock': 'red',
  absent: 'red', rejected: 'red',
};

const STATUS_COLUMNS = new Set([
  'status', 'approval', 'payment_status', 'interpretation', 'age_bucket',
  'leave_status', 'in_time_status', 'out_time_status',
]);

function isNumericColumn(key) {
  const lower = (key || '').toLowerCase();
  return NUMERIC_TOKENS.some((token) => lower.includes(token));
}

function formatNumber(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? '-');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value?.name || value?.code || value?.label || null;
  return value;
}

function readQueryFilters() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, val] of params.entries()) {
    if (val === '1') result[key] = true;
    else if (val === '0') result[key] = false;
    else result[key] = val;
  }
  return result;
}

function persistQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.set(key, value === true ? '1' : String(value));
  });
  const qs = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

export default function ReportPage() {
  const { token } = theme.useToken();
  const page = usePage();
  const permissions = page.props.auth?.permissions || [];
  const branchContext = page.props.branchContext || {};
  const reportOptions = page.props.reportOptions || {};

  const pageCategory = page.props.reportCategory;
  const pageReportKey = page.props.reportKey;
  const config = REPORT_CONFIG[`${pageCategory}/${pageReportKey}`] || {};

  const {
    title = 'Report',
    category = pageCategory,
    categoryTitle = pageCategory,
    reportKey = pageReportKey,
    description,
    filterSchema = [],
    permission,
  } = config;

  const canView = permissions.includes('reports.view') || (permission && permissions.includes(permission));
  const canExport = permissions.includes('reports.export');
  const defaultBranchId = branchContext.selectedBranchId || page.props.auth?.currentBranchId;

  const baseDefaults = useMemo(() => ({
    date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
    date_to: dayjs().format('YYYY-MM-DD'),
    as_of_date: dayjs().format('YYYY-MM-DD'),
    ageing_as_of_date: dayjs().format('YYYY-MM-DD'),
    branch_id: defaultBranchId,
    group_by: 'day',
    include_zero_balance: false,
    include_zero_stock: false,
    include_inactive: false,
  }), [defaultBranchId]);

  const [filters, setFilters] = useState(() => ({
    ...baseDefaults,
    ...readQueryFilters(),
    ...(defaultBranchId ? {} : {}),
  }));

  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedFilters, setGeneratedFilters] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [filtersDirty, setFiltersDirty] = useState(false);
  const printRef = useRef(null);

  // On mount: only persist query from URL — do NOT fetch
  useEffect(() => {
    persistQuery(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentBranchLabel = useMemo(() => {
    if (!filters.branch_id || filters.branch_id === 'all') return 'All Branches';
    const branches = reportOptions.branches || branchContext.branches || [];
    return branches.find((b) => String(b.id) === String(filters.branch_id))?.name || 'Current Branch';
  }, [branchContext.branches, filters.branch_id, reportOptions.branches]);

  const updateFilter = (updates) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };
      if (hasGenerated) setFiltersDirty(true);
      return next;
    });
  };

  const handleGenerate = async () => {
    persistQuery(filters);
    setState({ loading: true, error: null, data: state.data });
    setFiltersDirty(false);
    try {
      const { data } = await axios.get(api(`/api/reports/${category}/${reportKey}`), { params: filters });
      setState({ loading: false, error: data.error ? (data.error === true ? data.message : data.error) : null, data: data.error ? null : data });
      if (!data.error) {
        setHasGenerated(true);
        setGeneratedFilters({ ...filters });
        setGeneratedAt(dayjs().format('YYYY-MM-DD HH:mm:ss'));
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to load report.';
      setState({ loading: false, error: msg, data: null });
    }
  };

  const handleReset = () => {
    const next = { ...baseDefaults };
    setFilters(next);
    persistQuery({});
    setState({ loading: false, error: null, data: null });
    setHasGenerated(false);
    setGeneratedFilters(null);
    setGeneratedAt(null);
    setFiltersDirty(false);
  };

  const buildExportUrl = (format) => {
    const active = generatedFilters || filters;
    const params = new URLSearchParams();
    Object.entries(active).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) return;
      params.set(key, value === true ? '1' : String(value));
    });
    params.set('format', format);
    return api(`/api/reports/${category}/${reportKey}/export?${params.toString()}`);
  };

  const columns = useMemo(
    () =>
      (state.data?.columns || []).map((col) => ({
        title: col.title,
        dataIndex: col.key,
        key: col.key,
        align: isNumericColumn(col.key) ? 'right' : 'left',
        render: (value) => {
          const safe = safeValue(value);
          if (safe === null) return <Text type="secondary">-</Text>;
          if (STATUS_COLUMNS.has(col.key)) {
            const lower = String(safe).toLowerCase();
            return <Tag color={STATUS_COLORS[lower] || 'default'}>{String(safe)}</Tag>;
          }
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          if (isNumericColumn(col.key) && typeof safe === 'number') return formatNumber(safe);
          return String(safe);
        },
      })),
    [state.data?.columns],
  );

  const branchOptions = useMemo(() => [
    ...(branchContext.canViewAllBranches ? [{ value: 'all', label: 'All Branches' }] : []),
    ...((reportOptions.branches || branchContext.branches || []).map((b) => ({ value: b.id, label: b.name }))),
  ], [branchContext, reportOptions.branches]);

  const canGenerate = !state.loading;
  const canExportNow = canExport && hasGenerated && !state.loading;
  const canPrintNow = hasGenerated && !state.loading;

  if (!canView) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight">{title}</h2>}>
        <Head title={title} />
        <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <Card bordered={false} style={{ maxWidth: 480, textAlign: 'center' }}>
            <Space direction="vertical" size="middle">
              <Title level={4} style={{ color: token.colorError, margin: 0 }}>Access Denied</Title>
              <Text type="secondary">You do not have permission to view this report.</Text>
            </Space>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight">{title}</h2>}>
      <Head title={title} />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .report-toolbar, .ant-layout-sider, .ant-layout-header,
          .ant-breadcrumb, .report-no-print { display: none !important; }
          .print-only { display: block !important; }
          .ant-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          .ant-table-sticky-holder { position: static !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          @page { size: A4 landscape; margin: 12mm; }
        }
        .print-only { display: none; }
      `}</style>

      <div style={{ padding: 20, background: token.colorBgLayout, minHeight: 'calc(100vh - 96px)' }}>

        {/* Report header */}
        <Card bordered={false} style={{ marginBottom: 16, background: token.colorBgContainer }} className="report-no-print">
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Title level={4} style={{ margin: 0 }}>{title}</Title>
              <Tag color="blue">{categoryTitle}</Tag>
              {hasGenerated && generatedAt && (
                <Tag color="green">Generated {generatedAt}</Tag>
              )}
            </Space>
            {description && <Text type="secondary">{description}</Text>}
          </Space>
        </Card>

        {/* Filter panel */}
        <Card bordered={false} className="report-toolbar" style={{ marginBottom: 16, background: token.colorBgContainer }}>
          <Row gutter={[12, 16]}>
            {filterSchema.map((filter) => {
              if (filter.type === 'dateRange') {
                return (
                  <Col xs={24} md={12} lg={8} key={filter.key}>
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>{filter.label}</Text>
                      <RangePicker
                        style={{ width: '100%' }}
                        value={
                          filters.date_from && filters.date_to
                            ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                            : null
                        }
                        onChange={(value) =>
                          updateFilter({
                            date_from: value?.[0]?.format('YYYY-MM-DD') ?? null,
                            date_to: value?.[1]?.format('YYYY-MM-DD') ?? null,
                          })
                        }
                      />
                    </div>
                  </Col>
                );
              }

              if (filter.type === 'date') {
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key}>
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>{filter.label}</Text>
                      <DatePicker
                        style={{ width: '100%' }}
                        value={filters[filter.key] ? dayjs(filters[filter.key]) : null}
                        onChange={(value) => updateFilter({ [filter.key]: value?.format('YYYY-MM-DD') ?? null })}
                      />
                    </div>
                  </Col>
                );
              }

              if (filter.type === 'branch') {
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key}>
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>{filter.label}</Text>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Select Branch"
                        value={filters.branch_id || undefined}
                        onChange={(value) => updateFilter({ branch_id: value })}
                        options={branchOptions}
                      />
                    </div>
                  </Col>
                );
              }

              if (filter.type === 'checkbox') {
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                    <Checkbox
                      checked={Boolean(filters[filter.key])}
                      onChange={(e) => updateFilter({ [filter.key]: e.target.checked })}
                    >
                      {filter.label}
                    </Checkbox>
                  </Col>
                );
              }

              let options = [];
              if (filter.type === 'status') {
                options = ['draft', 'posted', 'part_paid', 'paid', 'void', 'cancelled'].map((v) => ({
                  value: v,
                  label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                }));
              } else if (filter.type === 'groupBy') {
                const groupByOpts = {
                  sales: ['day', 'week', 'month', 'customer', 'branch'],
                  purchase: ['day', 'week', 'month', 'supplier', 'branch'],
                };
                options = (groupByOpts[category] || ['day', 'week', 'month', 'branch']).map((v) => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }));
              } else {
                options = (reportOptions[filter.source] || []).map((item) => ({
                  value: item.id,
                  label: item.code
                    ? `${item.code} - ${item.name || item.user?.name || ''}`
                    : (item.name || item.user?.name || item.employee_id || String(item.id)),
                }));
              }

              return (
                <Col xs={24} md={8} lg={6} key={filter.key}>
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>{filter.label}</Text>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      style={{ width: '100%' }}
                      placeholder={`Select ${filter.label}`}
                      value={filters[filter.key] || undefined}
                      onChange={(value) => updateFilter({ [filter.key]: value ?? null })}
                      options={options}
                    />
                  </div>
                </Col>
              );
            })}

            <Col xs={24}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleGenerate}
                  loading={state.loading}
                  disabled={!canGenerate}
                >
                  Generate Report
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  disabled={!canExportNow}
                  onClick={() => window.open(buildExportUrl('xlsx'), '_blank')}
                >
                  Export Excel
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!canExportNow}
                  onClick={() => window.open(buildExportUrl('csv'), '_blank')}
                >
                  Export CSV
                </Button>
                <Button
                  icon={<FilePdfOutlined />}
                  disabled={!canExportNow}
                  onClick={() => window.open(buildExportUrl('pdf'), '_blank')}
                >
                  Export PDF
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  disabled={!canPrintNow}
                  onClick={() => window.print()}
                >
                  Print
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Filters changed warning */}
        {filtersDirty && hasGenerated && (
          <Alert
            type="warning"
            showIcon
            message="Filters changed — click Generate Report to refresh results."
            style={{ marginBottom: 16 }}
            className="report-no-print"
            closable
            onClose={() => setFiltersDirty(false)}
          />
        )}

        {/* Result area */}
        <div ref={printRef} className="report-print-area">

          {/* Print-only header (hidden on screen) */}
          <div className="print-only" style={{ marginBottom: 16, borderBottom: '2px solid #111', paddingBottom: 12 }}>
            <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>{title}</h1>
            {state.data?.company_name && <p style={{ margin: '2px 0', fontSize: 13 }}>{state.data.company_name}</p>}
            <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>
              Branch: {currentBranchLabel}
              {generatedAt && ` | Generated: ${generatedAt}`}
            </p>
            {state.data?.period?.from && (
              <p style={{ margin: '2px 0', fontSize: 12, color: '#555' }}>
                Period: {state.data.period.from} to {state.data.period.to}
              </p>
            )}
          </div>

          {/* Empty state before generation */}
          {!hasGenerated && !state.loading && !state.error && (
            <Card bordered={false} style={{ background: token.colorBgContainer }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center" size={4}>
                    <Text style={{ fontSize: 15, fontWeight: 500, color: token.colorText }}>
                      Generate Report
                    </Text>
                    <Text type="secondary">
                      Select filters above and click <strong>Generate Report</strong> to view results.
                    </Text>
                  </Space>
                }
              />
            </Card>
          )}

          {/* Loading */}
          {state.loading && (
            <Card bordered={false} style={{ background: token.colorBgContainer }}>
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">Generating report…</Text>
                </div>
              </div>
            </Card>
          )}

          {/* Error */}
          {!state.loading && state.error && (
            <Alert
              type="error"
              showIcon
              message="Report Error"
              description={state.error}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Results */}
          {!state.loading && !state.error && hasGenerated && state.data && (
            <>
              {/* Summary cards */}
              {(state.data.summary || []).length > 0 && (
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {state.data.summary.map((item) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={item.label}>
                      <Card bordered={false} size="small" style={{ background: token.colorBgContainer }}>
                        <Statistic
                          title={item.label}
                          value={typeof item.value === 'number' ? formatNumber(item.value) : (item.value ?? '-')}
                          valueStyle={{ fontSize: 18 }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}

              {/* Table */}
              <Card bordered={false} style={{ background: token.colorBgContainer }}>
                {(state.data.rows || []).length === 0 ? (
                  <Empty description="No records found for the selected filters." />
                ) : (
                  <Table
                    size="small"
                    sticky
                    rowKey={(_, index) => `row-${index}`}
                    columns={columns}
                    dataSource={state.data.rows || []}
                    pagination={{
                      pageSize: 100,
                      showSizeChanger: true,
                      pageSizeOptions: [50, 100, 250, 500],
                      showTotal: (total) => `${total.toLocaleString()} records`,
                    }}
                    scroll={{ x: 'max-content' }}
                    summary={() => {
                      const totalEntries = Object.entries(state.data.totals || {});
                      if (!totalEntries.length) return null;
                      return (
                        <Table.Summary fixed>
                          {totalEntries.map(([key, value]) => (
                            <Table.Summary.Row key={key}>
                              <Table.Summary.Cell
                                index={0}
                                colSpan={Math.max(columns.length - 1, 1)}
                              >
                                <Text strong>
                                  {key
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={1} align="right">
                                <Text strong>
                                  {typeof value === 'number'
                                    ? formatNumber(value)
                                    : String(value ?? '')}
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          ))}
                        </Table.Summary>
                      );
                    }}
                  />
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
