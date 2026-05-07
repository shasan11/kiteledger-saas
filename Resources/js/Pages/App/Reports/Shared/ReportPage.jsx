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
} from 'antd';
import { DownloadOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const STATUS_OPTIONS = ['draft', 'posted', 'part_paid', 'paid', 'void', 'cancelled'];
const GROUP_BY_OPTIONS = ['day', 'week', 'month', 'customer', 'branch'];

function readQuery(defaultBranchId) {
  const params = new URLSearchParams(window.location.search);
  return {
    date_from: params.get('date_from'),
    date_to: params.get('date_to'),
    as_of_date: params.get('as_of_date'),
    ageing_as_of_date: params.get('ageing_as_of_date'),
    branch_id: params.get('branch_id') || defaultBranchId || undefined,
    customer_id: params.get('customer_id') || undefined,
    supplier_id: params.get('supplier_id') || undefined,
    product_id: params.get('product_id') || undefined,
    warehouse_id: params.get('warehouse_id') || undefined,
    chart_of_account_id: params.get('chart_of_account_id') || undefined,
    department_id: params.get('department_id') || undefined,
    user_id: params.get('user_id') || undefined,
    status: params.get('status') || undefined,
    group_by: params.get('group_by') || 'day',
    include_zero_balance: params.get('include_zero_balance') === '1',
    include_zero_stock: params.get('include_zero_stock') === '1',
    include_inactive: params.get('include_inactive') === '1',
  };
}

function formatNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value ?? '-';
}

export default function ReportPage({
  title,
  category,
  reportKey,
  description,
  defaultFilters = {},
  filterSchema = [],
  permission,
}) {
  const page = usePage();
  const permissions = page.props.auth?.permissions || [];
  const branchContext = page.props.branchContext || {};
  const reportOptions = page.props.reportOptions || {};
  const canView = permissions.includes('reports.view') || permissions.includes(permission);
  const canExport = permissions.includes('reports.export');
  const defaultBranchId = branchContext.selectedBranchId || page.props.auth?.currentBranchId;
  const [filters, setFilters] = useState(() => ({ ...defaultFilters, ...readQuery(defaultBranchId) }));
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const printRef = useRef(null);

  const currentBranchLabel = useMemo(() => {
    if (filters.branch_id === 'all') return 'All Branches';
    const branches = branchContext.branches || reportOptions.branches || [];
    return branches.find((branch) => branch.id === filters.branch_id)?.name || 'Current Branch';
  }, [branchContext.branches, filters.branch_id, reportOptions.branches]);

  const persistQuery = (nextFilters) => {
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) return;
      params.set(key, value === true ? '1' : value);
    });
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  };

  const fetchData = async (activeFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data } = await axios.get(api(`/api/reports/${category}/${reportKey}`), { params: activeFilters });
      setState({ loading: false, error: null, data });
    } catch (error) {
      setState({ loading: false, error: error?.response?.data?.message || 'Failed to load report.', data: null });
    }
  };

  useEffect(() => {
    persistQuery(filters);
    fetchData(filters);
  }, []);

  const handleApply = () => {
    persistQuery(filters);
    fetchData(filters);
  };

  const handleReset = () => {
    const nextFilters = { ...defaultFilters, branch_id: defaultBranchId, group_by: 'day' };
    setFilters(nextFilters);
    persistQuery(nextFilters);
    fetchData(nextFilters);
  };

  const exportUrl = (format) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) return;
      params.set(key, value === true ? '1' : value);
    });
    params.set('format', format);
    return api(`/api/reports/${category}/${reportKey}/export?${params.toString()}`);
  };

  const columns = useMemo(
    () =>
      (state.data?.columns || []).map((column) => ({
        title: column.title,
        dataIndex: column.key,
        key: column.key,
        align: ['debit', 'credit', 'total', 'amount', 'balance', 'value', 'qty', 'qty_on_hand', 'stock_value', 'avg_cost', 'paid_total', 'balance_due', 'grand_total', 'subtotal', 'tax', 'discount', 'invoice_total', 'bill_total', 'net_purchase', 'net_sales', 'salary', 'bonus', 'deduction', 'total_payable'].some((token) => column.key.includes(token))
          ? 'right'
          : 'left',
        render: (value) => {
          if (value === null || value === undefined || value === '') return '-';
          if (typeof value === 'number') return formatNumber(value);
          if (['status', 'approval', 'payment_status', 'interpretation'].includes(column.key)) return <Tag>{String(value)}</Tag>;
          return value;
        },
      })),
    [state.data?.columns],
  );

  if (!canView) {
    return (
      <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Reports</h2>}>
        <Head title={title} />
        <div style={{ padding: 24 }}>
          <Alert type="warning" message="You do not have permission to view this report." />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">{title}</h2>}>
      <Head title={title} />
      <div style={{ padding: 20, background: '#f5f7fb', minHeight: 'calc(100vh - 96px)' }}>
        <style>{`@media print {.report-toolbar{display:none !important;} body{background:#fff !important;}}`}</style>
        <Card bordered={false} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
            <Text type="secondary">{description}</Text>
            <Space wrap>
              <Tag>{category.toUpperCase()}</Tag>
              <Tag>{currentBranchLabel}</Tag>
              <Tag>Generated {dayjs().format('YYYY-MM-DD HH:mm')}</Tag>
            </Space>
          </Space>
        </Card>

        <Card bordered={false} className="report-toolbar" style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            {filterSchema.map((filter) => {
              if (filter.type === 'dateRange') {
                return (
                  <Col xs={24} md={12} lg={8} key={filter.key}>
                    <RangePicker
                      style={{ width: '100%' }}
                      value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
                      onChange={(value) => setFilters((prev) => ({ ...prev, date_from: value?.[0]?.format('YYYY-MM-DD'), date_to: value?.[1]?.format('YYYY-MM-DD') }))}
                    />
                  </Col>
                );
              }
              if (filter.type === 'date') {
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key}>
                    <DatePicker style={{ width: '100%' }} value={filters[filter.key] ? dayjs(filters[filter.key]) : null} onChange={(value) => setFilters((prev) => ({ ...prev, [filter.key]: value?.format('YYYY-MM-DD') }))} />
                  </Col>
                );
              }
              if (filter.type === 'branch') {
                const branchOptions = [...(branchContext.canViewAllBranches ? [{ value: 'all', label: 'All Branches' }] : []), ...((reportOptions.branches || branchContext.branches || []).map((branch) => ({ value: branch.id, label: branch.name })))];
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key}>
                    <Select style={{ width: '100%' }} placeholder={filter.label} value={filters.branch_id} onChange={(value) => setFilters((prev) => ({ ...prev, branch_id: value }))} options={branchOptions} />
                  </Col>
                );
              }
              if (filter.type === 'checkbox') {
                return (
                  <Col xs={24} md={8} lg={6} key={filter.key} style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox checked={Boolean(filters[filter.key])} onChange={(event) => setFilters((prev) => ({ ...prev, [filter.key]: event.target.checked }))}>
                      {filter.label}
                    </Checkbox>
                  </Col>
                );
              }
              const options =
                filter.type === 'status'
                  ? STATUS_OPTIONS.map((value) => ({ value, label: value }))
                  : filter.type === 'groupBy'
                    ? GROUP_BY_OPTIONS.map((value) => ({ value, label: value }))
                    : (reportOptions[filter.source] || []).map((item) => ({
                        value: item.id,
                        label: item.name || item.employee_id || item.code || item.user?.name,
                      }));
              return (
                <Col xs={24} md={8} lg={6} key={filter.key}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                    placeholder={filter.label}
                    value={filters[filter.key]}
                    onChange={(value) => setFilters((prev) => ({ ...prev, [filter.key]: value }))}
                    options={options}
                  />
                </Col>
              );
            })}
            <Col xs={24}>
              <Space wrap>
                <Button type="primary" onClick={handleApply}>Apply</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={() => window.open(exportUrl('xlsx'), '_blank')}>Excel</Button>
                <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={() => window.open(exportUrl('csv'), '_blank')}>CSV</Button>
                <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={() => window.open(exportUrl('pdf'), '_blank')}>PDF</Button>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {state.loading ? (
          <Card bordered={false}><div style={{ padding: 48, textAlign: 'center' }}><Spin /></div></Card>
        ) : state.error ? (
          <Alert type="error" message={state.error} />
        ) : (
          <div ref={printRef}>
            {(state.data?.summary || []).length > 0 && (
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {state.data.summary.map((item) => (
                  <Col xs={24} md={8} lg={6} key={item.label}>
                    <Card bordered={false}>
                      <Statistic title={item.label} value={typeof item.value === 'number' ? formatNumber(item.value) : item.value} />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <Card bordered={false}>
              {(state.data?.rows || []).length === 0 ? (
                <Empty description="No records found for the selected filters." />
              ) : (
                <Table
                  size="small"
                  sticky
                  rowKey={(_, index) => `${reportKey}-${index}`}
                  columns={columns}
                  dataSource={state.data?.rows || []}
                  pagination={{ pageSize: 50, showSizeChanger: true }}
                  scroll={{ x: 'max-content' }}
                  summary={() => {
                    const totalEntries = Object.entries(state.data?.totals || {});
                    if (!totalEntries.length) return null;
                    return (
                      <Table.Summary fixed>
                        {totalEntries.map(([key, value]) => (
                          <Table.Summary.Row key={key}>
                            <Table.Summary.Cell index={0} colSpan={Math.max(columns.length - 1, 1)}>
                              <Text strong>{key.replaceAll('_', ' ')}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <Text strong>{typeof value === 'number' ? formatNumber(value) : value}</Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        ))}
                      </Table.Summary>
                    );
                  }}
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
