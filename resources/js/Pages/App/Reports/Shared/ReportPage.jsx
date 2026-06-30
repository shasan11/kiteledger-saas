import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import ReportSummaryButton from '@/Components/Reports/ReportSummaryButton.jsx';

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

function AsyncOptionSelect({
  source, value, label, placeholder, onChange,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async (search) => {
    setLoading(true);
    try {
      const { data } = await axios.get(api(`/api/reports/options/${source}`), {
        params: {
          search: search || undefined,
          selected_id: value || undefined,
          limit: 30,
        },
      });
      setOptions((data?.items || []).map((item) => ({
        value: item.id,
        label: item.label || item.name || String(item.id),
      })));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [source, value]);

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const handleSearch = (search) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 250);
  };

  return (
    <Select
      allowClear
      showSearch
      filterOption={false}
      loading={loading}
      style={{ width: '100%' }}
      placeholder={placeholder || `Select ${label}`}
      value={value || undefined}
      onChange={(v) => onChange(v ?? null)}
      onSearch={handleSearch}
      options={options}
    />
  );
}

export default function ReportPage() {
  const { token } = theme.useToken();
  const page = usePage();
  const permissions = page.props.auth?.permissions || [];
  const canBypass = !!page.props.auth?.canBypassPermissions;
  const can = (permissionName) => canBypass || permissions.includes(permissionName);
  const branchContext = page.props.branchContext || {};

  const pageCategory = page.props.reportCategory;
  const pageReportKey = page.props.reportKey;
  const config = page.props.reportConfig || {};

  const {
    title = pageReportKey || 'Report',
    category_label: categoryTitle = pageCategory,
    description,
    filter_schema: filterSchema = [],
    permission,
    default_date_mode: defaultDateMode = 'period',
  } = config;

  const category = pageCategory;
  const reportKey = pageReportKey;

  const canView = can('reports.view') || (permission && can(permission));
  const canExport = can('reports.export');
  const canSummarize = can('reports.ai_summary');
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
  }));

  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedFilters, setGeneratedFilters] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [filtersDirty, setFiltersDirty] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    persistQuery(filters);
    if (new URLSearchParams(window.location.search).get('auto_generate') === '1') {
      // honoured opt-in only
      // eslint-disable-next-line no-use-before-define
      setTimeout(() => handleGenerate(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const before = () => setIsPrinting(true);
    const after = () => setIsPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 200);
    }, 80);
  };

  const currentBranchLabel = useMemo(() => {
    if (!filters.branch_id || filters.branch_id === 'all') return 'All Branches';
    const branches = branchContext.branches || [];
    return branches.find((b) => String(b.id) === String(filters.branch_id))?.name || 'Current Branch';
  }, [branchContext.branches, filters.branch_id]);

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
      setState({
        loading: false,
        error: data.error ? (data.error === true ? data.message : data.error) : null,
        data: data.error ? null : data,
      });
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

  const canPrintNow = hasGenerated && !state.loading;
  const canExportNow = canExport && hasGenerated && !state.loading;

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

  const renderFilter = (filter) => {
    const labelEl = (
      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
        {filter.label}
      </Text>
    );

    if (filter.type === 'dateRange') {
      return (
        <Col xs={24} md={12} lg={8} key={filter.key}>
          {labelEl}
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
        </Col>
      );
    }

    if (filter.type === 'date') {
      return (
        <Col xs={24} md={8} lg={6} key={filter.key}>
          {labelEl}
          <DatePicker
            style={{ width: '100%' }}
            value={filters[filter.key] ? dayjs(filters[filter.key]) : null}
            onChange={(value) => updateFilter({ [filter.key]: value?.format('YYYY-MM-DD') ?? null })}
          />
        </Col>
      );
    }

    if (filter.type === 'branch') {
      return (
        <Col xs={24} md={8} lg={6} key={filter.key}>
          {labelEl}
          <AsyncOptionSelect
            source="branches"
            label={filter.label}
            value={filters.branch_id}
            onChange={(v) => updateFilter({ branch_id: v })}
          />
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

    if (filter.type === 'status') {
      const options = ['draft', 'posted', 'part_paid', 'paid', 'void', 'cancelled'].map((v) => ({
        value: v,
        label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
      return (
        <Col xs={24} md={8} lg={6} key={filter.key}>
          {labelEl}
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder={`Select ${filter.label}`}
            value={filters[filter.key] || undefined}
            onChange={(v) => updateFilter({ [filter.key]: v ?? null })}
            options={options}
          />
        </Col>
      );
    }

    if (filter.type === 'groupBy') {
      const groupByOpts = {
        sales: ['day', 'week', 'month', 'customer', 'branch'],
        purchase: ['day', 'week', 'month', 'supplier', 'branch'],
      };
      const options = (groupByOpts[category] || ['day', 'week', 'month', 'branch']).map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));
      return (
        <Col xs={24} md={8} lg={6} key={filter.key}>
          {labelEl}
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder={`Select ${filter.label}`}
            value={filters[filter.key] || undefined}
            onChange={(v) => updateFilter({ [filter.key]: v ?? null })}
            options={options}
          />
        </Col>
      );
    }

    // Default: async select from /api/reports/options/{source}
    return (
      <Col xs={24} md={8} lg={6} key={filter.key}>
        {labelEl}
        <AsyncOptionSelect
          source={filter.source}
          label={filter.label}
          value={filters[filter.key]}
          onChange={(v) => updateFilter({ [filter.key]: v })}
        />
      </Col>
    );
  };

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight">{title}</h2>}>
      <Head title={title} />

      <style>{`
        .print-only { display: none; }

        @media print {
          /* Zero @page margin so the browser has no room for its default
             header/footer (URL, page numbers, date). Real margins live on
             .report-print-area below. Users can re-enable browser headers
             from the print dialog if they want. */
          @page { size: A4 landscape; margin: 0; }

          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }

          /* Hide everything except the print area */
          body * { visibility: hidden !important; }
          .report-print-area, .report-print-area * { visibility: visible !important; }
          .report-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 8mm 8mm 10mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }

          /* Hide chrome */
          .report-toolbar, .ant-layout-sider, .ant-layout-header,
          .ant-breadcrumb, .report-no-print,
          .ant-pagination, .ant-table-pagination,
          .ant-back-top, .ant-float-btn-group, .ant-float-btn {
            display: none !important;
          }

          .print-only { display: block !important; }

          /* Strip down card/container shells */
          .report-print-area .ant-card,
          .report-print-area .ant-card-bordered { background: #fff !important; border: 0 !important; box-shadow: none !important; }
          .report-print-area .ant-card-body { padding: 0 !important; }

          /* Tight print header */
          .report-print-header { border-bottom: 1.5px solid #000 !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
          .report-print-header h1 { font-size: 16px !important; margin: 0 0 2px !important; font-weight: 700 !important; }
          .report-print-header .meta { font-size: 10px !important; color: #333 !important; margin: 1px 0 !important; }
          .report-print-header .filters-line { font-size: 9.5px !important; color: #555 !important; margin-top: 2px !important; }

          /* Summary cards → inline compact strip */
          .report-summary-row { display: flex !important; flex-wrap: wrap !important; gap: 0 !important;
            border: 1px solid #999 !important; border-radius: 0 !important; margin: 0 0 6px !important; }
          .report-summary-row .ant-col { flex: 1 1 0 !important; max-width: none !important; padding: 0 !important; }
          .report-summary-row .ant-card { border-right: 1px solid #ddd !important; border-radius: 0 !important; }
          .report-summary-row .ant-col:last-child .ant-card { border-right: 0 !important; }
          .report-summary-row .ant-card-body { padding: 4px 8px !important; }
          .report-summary-row .ant-statistic-title { font-size: 9px !important; color: #444 !important; margin: 0 !important; }
          .report-summary-row .ant-statistic-content { font-size: 11px !important; line-height: 1.2 !important; }
          .report-summary-row .ant-statistic-content-value { font-weight: 600 !important; }

          /* Table density */
          .report-print-area .ant-table,
          .report-print-area .ant-table-content,
          .report-print-area .ant-table-container,
          .report-print-area .ant-table-cell { background: #fff !important; color: #000 !important; }
          .report-print-area .ant-table { font-size: 9px !important; }
          .report-print-area .ant-table-thead > tr > th {
            background: #f0f0f0 !important;
            color: #000 !important;
            font-weight: 700 !important;
            padding: 3px 5px !important;
            border-bottom: 1px solid #000 !important;
            border-right: 1px solid #ddd !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
          }
          .report-print-area .ant-table-tbody > tr > td {
            padding: 2px 5px !important;
            border-bottom: 1px solid #e5e5e5 !important;
            border-right: 1px solid #f0f0f0 !important;
            line-height: 1.2 !important;
          }
          .report-print-area .ant-table-tbody > tr:nth-child(even) > td { background: #fafafa !important; }
          .report-print-area .ant-table-summary > tr > td {
            font-weight: 700 !important;
            border-top: 1.5px solid #000 !important;
            border-bottom: 1.5px solid #000 !important;
            padding: 3px 5px !important;
            background: #fff !important;
          }

          /* Tag rendering — plain text-ish */
          .report-print-area .ant-tag {
            background: transparent !important;
            border: 1px solid #888 !important;
            color: #000 !important;
            padding: 0 4px !important;
            font-size: 9px !important;
            line-height: 1.3 !important;
            margin: 0 !important;
          }

          /* Strip scroll wrappers so the whole table flows */
          .report-print-area .ant-table-body,
          .report-print-area .ant-table-content,
          .report-print-area .ant-table-container { overflow: visible !important; }
          .report-print-area .ant-table-sticky-holder,
          .report-print-area .ant-table-sticky-scroll { position: static !important; display: none !important; }

          /* Page break behaviour */
          .report-print-area table { page-break-inside: auto !important; border-collapse: collapse !important; width: 100% !important; }
          .report-print-area tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          .report-print-area thead { display: table-header-group !important; }
          .report-print-area tfoot { display: table-footer-group !important; }
          .report-print-area .ant-alert { display: none !important; }
          .report-print-area .ant-empty { padding: 16px 0 !important; }

          /* Right-align numerics (use tabular-nums for clean column alignment) */
          .report-print-area .ant-table-cell { font-variant-numeric: tabular-nums !important; }
        }
      `}</style>

      <div style={{ padding: 20, background: token.colorBgLayout, minHeight: 'calc(100vh - 96px)' }}>

        <Card bordered={false} style={{ marginBottom: 16, background: token.colorBgContainer }} className="report-no-print">
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Title level={4} style={{ margin: 0 }}>{title}</Title>
              <Tag color="blue">{categoryTitle}</Tag>
              {hasGenerated && generatedAt && (
                <Tag color="green">Generated {generatedAt}</Tag>
              )}
              <Tag>{defaultDateMode === 'as_of' ? 'As-of report' : defaultDateMode === 'ageing' ? 'Ageing report' : defaultDateMode === 'none' ? 'Master list' : 'Period report'}</Tag>
            </Space>
            {description && <Text type="secondary">{description}</Text>}
          </Space>
        </Card>

        <Card bordered={false} className="report-toolbar" style={{ marginBottom: 16, background: token.colorBgContainer }}>
          <Row gutter={[12, 16]}>
            {filterSchema.map(renderFilter)}

            <Col xs={24}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleGenerate}
                  loading={state.loading}
                >
                  Generate Report
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                {canSummarize && (
                  <ReportSummaryButton
                    category={category}
                    reportKey={reportKey}
                    reportTitle={title}
                    filters={generatedFilters || filters}
                    columns={state.data?.columns || []}
                    rows={state.data?.rows || []}
                    totals={state.data?.totals || {}}
                    summaryCards={state.data?.summary || []}
                    metadata={{
                      currency: state.data?.currency?.code || page.props.defaultCurrency?.code || '',
                      branch: currentBranchLabel,
                      generated_at: generatedAt,
                    }}
                    disabled={!hasGenerated || state.loading || filtersDirty}
                  />
                )}
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
                  onClick={handlePrint}
                >
                  Print
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

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

        <div ref={printRef} className="report-print-area">
          <div className="print-only report-print-header">
            {(() => {
              const company = state.data?.company || {};
              const contactBits = [
                company.phone && `Phone: ${company.phone}`,
                company.email && `Email: ${company.email}`,
                company.website,
              ].filter(Boolean);
              const taxBits = [
                company.tax_number && `Tax No: ${company.tax_number}`,
                company.vat_number && `VAT No: ${company.vat_number}`,
                company.registration_number && `Reg No: ${company.registration_number}`,
              ].filter(Boolean);
              return (
                <>
                  {company.name && <h1>{company.name}</h1>}
                  {company.tag_line && <p className="meta">{company.tag_line}</p>}
                  {company.address && <p className="meta">{company.address}</p>}
                  {contactBits.length > 0 && (
                    <p className="meta">{contactBits.join('  ·  ')}</p>
                  )}
                  {taxBits.length > 0 && (
                    <p className="meta">{taxBits.join('  ·  ')}</p>
                  )}
                </>
              );
            })()}

            <p className="report-title" style={{ fontSize: 13, fontWeight: 700, margin: '6px 0 2px' }}>
              {title}
            </p>
            <p className="meta">
              <strong>{categoryTitle}</strong>
              {` · Branch: ${currentBranchLabel}`}
              {generatedAt && ` · Generated: ${generatedAt}`}
            </p>
            {(state.data?.period?.from || generatedFilters?.as_of_date || generatedFilters?.ageing_as_of_date) && (
              <p className="meta">
                {state.data?.period?.from
                  ? `Period: ${state.data.period.from} to ${state.data.period.to}`
                  : generatedFilters?.as_of_date
                    ? `As of: ${generatedFilters.as_of_date}`
                    : `Ageing as of: ${generatedFilters.ageing_as_of_date}`}
              </p>
            )}
            {generatedFilters && (
              <p className="filters-line">
                {Object.entries(generatedFilters)
                  .filter(([k, v]) =>
                    v !== null && v !== '' && v !== false
                    && !['date_from', 'date_to', 'as_of_date', 'ageing_as_of_date', 'branch_id', 'group_by'].includes(k))
                  .slice(0, 8)
                  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                  .join('  ·  ')}
              </p>
            )}
          </div>

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

          {!state.loading && state.error && (
            <Alert
              type="error"
              showIcon
              message="Report Error"
              description={state.error}
              style={{ marginBottom: 16 }}
            />
          )}

          {!state.loading && !state.error && hasGenerated && state.data && (
            <>
              {(state.data.summary || []).length > 0 && (
                <Row gutter={[12, 12]} className="report-summary-row" style={{ marginBottom: 16 }}>
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

              <Card bordered={false} style={{ background: token.colorBgContainer }}>
                {(state.data.rows || []).length === 0 ? (
                  <Empty description="No records found for the selected filters." />
                ) : (
                  <Table
                    size="small"
                    sticky={!isPrinting}
                    rowKey={(_, index) => `row-${index}`}
                    columns={columns}
                    dataSource={state.data.rows || []}
                    pagination={isPrinting ? false : {
                      pageSize: 100,
                      showSizeChanger: true,
                      pageSizeOptions: [50, 100, 250, 500],
                      showTotal: (total) => `${total.toLocaleString()} records`,
                    }}
                    scroll={isPrinting ? undefined : { x: 'max-content' }}
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
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={1} align="right">
                                <Text strong>
                                  {typeof value === 'number' ? formatNumber(value) : String(value ?? '')}
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
