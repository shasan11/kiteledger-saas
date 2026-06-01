import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  BuildOutlined,
  CreditCardOutlined,
  DollarCircleOutlined,
  FileSearchOutlined,
  InboxOutlined,
  PercentageOutlined,
  PieChartOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

const { Search } = Input;
const { Title, Text } = Typography;

const ICONS = {
  book: <BookOutlined />,
  dollar: <DollarCircleOutlined />,
  credit: <CreditCardOutlined />,
  'shopping-cart': <ShoppingCartOutlined />,
  shopping: <ShoppingOutlined />,
  percentage: <PercentageOutlined />,
  inbox: <InboxOutlined />,
  build: <BuildOutlined />,
  team: <TeamOutlined />,
  audit: <AuditOutlined />,
  pie: <PieChartOutlined />,
};

function matchReport(query, category, report) {
  if (!query) return true;

  const q = query.toLowerCase();

  return (
    category.title.toLowerCase().includes(q) ||
    (category.description || '').toLowerCase().includes(q) ||
    report.title.toLowerCase().includes(q) ||
    (report.description || '').toLowerCase().includes(q) ||
    (report.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
    (report.keywords || []).some((k) => k.toLowerCase().includes(q))
  );
}

export default function ReportsIndex() {
  const { token } = theme.useToken();
  const page = usePage();

  const permissions = page.props.auth?.permissions || [];
  const initialRegistry = page.props.reportRegistry || { categories: [] };

  const [registry, setRegistry] = useState(initialRegistry);
  const [loading, setLoading] = useState(false);
  const [registryError, setRegistryError] = useState(null);
  const [search, setSearch] = useState('');
  const [softQuery, setSoftQuery] = useState('');
  const [softState, setSoftState] = useState({
    loading: false,
    result: null,
    error: null,
    suggestions: [],
  });

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    axios
      .get(api('/api/reports/registry'))
      .then(({ data }) => {
        if (!cancelled && data?.categories) {
          setRegistry(data);
          setRegistryError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRegistryError(
            err?.response?.data?.message ||
              err.message ||
              'Failed to load registry.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyReportsPermission = useMemo(() => {
    return (
      (registry.categories || []).length > 0 ||
      permissions.includes('reports.view') ||
      permissions.some((p) => p.startsWith('reports.'))
    );
  }, [registry, permissions]);

  const visibleCategories = useMemo(() => {
    return (registry.categories || [])
      .map((category) => ({
        ...category,
        reports: (category.reports || []).filter((report) =>
          matchReport(search, category, report),
        ),
      }))
      .filter((category) => category.reports.length > 0);
  }, [registry, search]);

  const totalReports = useMemo(() => {
    return visibleCategories.reduce(
      (total, category) => total + category.reports.length,
      0,
    );
  }, [visibleCategories]);

  const getCategoryColor = (key) => {
    const colors = {
      accounting: token.colorPrimary,
      receivable: token.colorSuccess,
      payable: token.colorError,
      sales: token.colorWarning,
      purchase: token.colorInfo,
      tax: token.colorPrimary,
      inventory: token.colorSuccess,
      production: token.colorInfo,
      hr: token.colorError,
      system: token.colorTextSecondary,
      analytics: token.colorWarning,
    };

    return colors[key] || token.colorPrimary;
  };

  const handleSoftQuery = async () => {
    const value = softQuery.trim();
    if (!value) return;

    setSoftState({
      loading: true,
      result: null,
      error: null,
      suggestions: [],
    });

    try {
      const { data } = await axios.post(api('/api/reports/soft-query'), {
        query: value,
      });

      if (data.ok && data.matched) {
        setSoftState({
          loading: false,
          result: data.result,
          error: null,
          suggestions: [],
        });
      } else {
        setSoftState({
          loading: false,
          result: null,
          error: data.message || 'No matching report found.',
          suggestions: data.suggestions || [],
        });
      }
    } catch (err) {
      setSoftState({
        loading: false,
        result: null,
        error:
          err?.response?.data?.message ||
          err.message ||
          'Soft query failed.',
        suggestions: [],
      });
    }
  };

  const openSoftResult = (autoGenerate = false) => {
    const result = softState.result;
    if (!result) return;

    const url = autoGenerate
      ? `${result.open_url}${result.open_url.includes('?') ? '&' : '?'}auto_generate=1`
      : result.open_url;

    router.visit(url);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Reports" />

      <style>{`
        html,
        body,
        #app {
          min-height: 100%;
          background: ${token.colorBgLayout};
        }

        .reports-page {
          width: 100%;
          min-height: 100dvh;
          background: ${token.colorBgLayout};
          padding: 12px;
          box-sizing: border-box;
        }

        .reports-shell {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        .reports-header-card {
          border: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorBgContainer};
          box-shadow: ${token.boxShadowTertiary};
          margin-bottom: 12px;
        }

        .reports-header-card .ant-card-body {
          padding: 12px;
        }

        .reports-title-icon {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${token.borderRadiusLG}px;
          background: ${token.colorFillTertiary};
          color: ${token.colorPrimary};
          font-size: 18px;
          flex: 0 0 36px;
        }

        .reports-ai-box {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px;
          border: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorFillQuaternary};
          border-radius: ${token.borderRadiusLG}px;
        }

        .reports-ai-icon {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${token.borderRadius}px;
          color: ${token.colorPrimary};
          background: ${token.colorBgContainer};
          flex: 0 0 30px;
        }

        .report-card {
          height: 100%;
          border: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorBgContainer};
          box-shadow: ${token.boxShadowTertiary};
        }

        .report-card:hover {
          border-color: ${token.colorBorder};
          box-shadow: ${token.boxShadowSecondary};
        }

        .report-card .ant-card-body {
          padding: 10px;
          height: 100%;
        }

        .report-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
        }

        .report-card-left {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .report-card-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${token.borderRadiusLG}px;
          background: ${token.colorFillTertiary};
          font-size: 17px;
          flex: 0 0 34px;
        }

        .report-title {
          margin: 0 !important;
          font-size: 14px !important;
          line-height: 1.2 !important;
        }

        .report-description {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .report-links {
          display: grid;
          grid-template-columns: 1fr;
          gap: 5px;
        }

        .report-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          padding: 6px 8px;
          border-radius: ${token.borderRadius}px;
          color: ${token.colorText};
          background: ${token.colorFillQuaternary};
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.25;
        }

        .report-link:hover {
          color: ${token.colorPrimary};
          background: ${token.colorBgTextHover};
          border-color: ${token.colorBorderSecondary};
        }

        .report-link-name {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .report-link-arrow {
          color: ${token.colorTextTertiary};
          font-size: 12px;
          flex: 0 0 auto;
        }

        .report-state-card {
          border: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorBgContainer};
          box-shadow: ${token.boxShadowTertiary};
        }

        .soft-result-box {
          margin-top: 10px;
        }

        @media (max-width: 992px) {
          .reports-ai-box {
            align-items: stretch;
            flex-direction: column;
          }

          .reports-ai-icon {
            display: none;
          }

          .reports-ai-box .ant-input {
            width: 100%;
          }

          .reports-ai-box .ant-btn {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .reports-page {
            padding: 8px;
          }

          .reports-header-card .ant-card-body {
            padding: 10px;
          }
        }
      `}</style>

      <main className="reports-page">
        <div className="reports-shell">
          <Card bordered={false} className="reports-header-card">
            <Row gutter={[10, 10]} align="middle">
              <Col xs={24} lg={7}>
                <Space align="center" size={10}>
                  <span className="reports-title-icon">
                    <BarChartOutlined />
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <Title level={4} style={{ margin: 0 }}>
                      Reports
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {visibleCategories.length} groups · {totalReports} reports
                    </Text>
                  </div>
                </Space>
              </Col>

              <Col xs={24} lg={8}>
                <Search
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Search report..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>

              <Col xs={24} lg={9}>
                <div className="reports-ai-box">
                  <span className="reports-ai-icon">
                    <ThunderboltOutlined />
                  </span>

                  <Input
                    allowClear
                    placeholder="Ask: customer ageing this month"
                    value={softQuery}
                    onChange={(e) => setSoftQuery(e.target.value)}
                    onPressEnter={handleSoftQuery}
                  />

                  <Button
                    type="primary"
                    loading={softState.loading}
                    onClick={handleSoftQuery}
                  >
                    Find
                  </Button>
                </div>
              </Col>
            </Row>

            {softState.result && (
              <Alert
                className="soft-result-box"
                type="success"
                showIcon
                message={
                  <Space wrap>
                    <Text strong>{softState.result.title}</Text>
                    <Tag>{softState.result.category_label}</Tag>
                    <Tag>
                      {(softState.result.confidence * 100).toFixed(0)}%
                    </Tag>
                  </Space>
                }
                description={
                  <Space wrap size={8}>
                    {softState.result.reason && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {softState.result.reason}
                      </Text>
                    )}

                    <Button size="small" onClick={() => openSoftResult(false)}>
                      Open
                    </Button>

                    <Button
                      size="small"
                      type="primary"
                      onClick={() => openSoftResult(true)}
                    >
                      Generate
                    </Button>
                  </Space>
                }
              />
            )}

            {softState.error && (
              <Alert
                className="soft-result-box"
                type="warning"
                showIcon
                message={softState.error}
                description={
                  softState.suggestions?.length ? (
                    <Space wrap>
                      {softState.suggestions.map((suggestion) => (
                        <Link
                          key={suggestion.route_path}
                          href={suggestion.route_path}
                        >
                          <Tag style={{ cursor: 'pointer' }}>
                            {suggestion.title}
                          </Tag>
                        </Link>
                      ))}
                    </Space>
                  ) : null
                }
              />
            )}
          </Card>

          {registryError && (
            <Alert
              type="warning"
              showIcon
              message="Live registry unavailable"
              description={`Showing initial registry. ${registryError}`}
              style={{ marginBottom: 12 }}
            />
          )}

          {!hasAnyReportsPermission ? (
            <Card
              bordered={false}
              className="report-state-card"
              styles={{ body: { padding: 48 } }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="You do not have permission to view any reports."
              />
            </Card>
          ) : loading && visibleCategories.length === 0 ? (
            <Card
              bordered={false}
              className="report-state-card"
              styles={{ body: { padding: 48, textAlign: 'center' } }}
            >
              <Spin />
            </Card>
          ) : visibleCategories.length === 0 ? (
            <Card
              bordered={false}
              className="report-state-card"
              styles={{ body: { padding: 48 } }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No reports found"
              />
            </Card>
          ) : (
            <Row gutter={[10, 10]} align="stretch">
              {visibleCategories.map((category) => {
                const icon = ICONS[category.icon] || <FileSearchOutlined />;
                const color = getCategoryColor(category.key);

                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={category.key}>
                    <Card bordered={false} className="report-card">
                      <div className="report-card-head">
                        <div className="report-card-left">
                          <span
                            className="report-card-icon"
                            style={{ color }}
                          >
                            {icon}
                          </span>

                          <div style={{ minWidth: 0 }}>
                            <Title level={5} className="report-title">
                              {category.title}
                            </Title>

                            {category.description && (
                              <Text
                                type="secondary"
                                className="report-description"
                              >
                                {category.description}
                              </Text>
                            )}
                          </div>
                        </div>

                        <Tag style={{ marginInlineEnd: 0 }}>
                          {category.reports.length}
                        </Tag>
                      </div>

                      <div className="report-links">
                        {category.reports.map((report) => (
                          <Link
                            key={report.key}
                            href={
                              report.route_path ||
                              `/reports/${category.key}/${report.key}`
                            }
                            className="report-link"
                          >
                            <span className="report-link-name">
                              {report.title}
                            </span>

                            <span className="report-link-arrow">→</span>
                          </Link>
                        ))}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </main>
    </AuthenticatedLayout>
  );
}