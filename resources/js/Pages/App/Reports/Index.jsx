import { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  BuildOutlined,
  CalculatorOutlined,
  CreditCardOutlined,
  DollarCircleOutlined,
  FileSearchOutlined,
  InboxOutlined,
  PercentageOutlined,
  PieChartOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { REPORT_CATEGORIES, hasReportPermission } from './reportRegistry';
 const { Search } = Input;
const { Title, Text } = Typography;

const hexToRgba = (hex, alpha = 0.12) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;

  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);

  if (clean.length !== 6 || Number.isNaN(bigint)) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createCategoryMeta = (token) => ({
  accounting: {
    icon: <BookOutlined />,
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Ledger, trial balance, statements and cash flow',
  },
  receivable: {
    icon: <DollarCircleOutlined />,
    color: '#16a34a',
    bg: '#f0fdf4',
    description: 'Customer balances, ageing and statements',
  },
  payable: {
    icon: <CreditCardOutlined />,
    color: '#dc2626',
    bg: '#fef2f2',
    description: 'Supplier balances, bills ageing and statements',
  },
  sales: {
    icon: <ShoppingCartOutlined />,
    color: '#ea580c',
    bg: '#fff7ed',
    description: 'Sales summaries, customers, items and masters',
  },
  purchase: {
    icon: <ShoppingOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    description: 'Purchase analysis by supplier, item and period',
  },
  tax: {
    icon: <PercentageOutlined />,
    color: '#0891b2',
    bg: '#ecfeff',
    description: 'VAT, TDS, registers and statutory reports',
  },
  inventory: {
    icon: <InboxOutlined />,
    color: '#0f766e',
    bg: '#f0fdfa',
    description: 'Stock position, movement, ledger and profitability',
  },
  production: {
    icon: <BuildOutlined />,
    color: '#9333ea',
    bg: '#faf5ff',
    description: 'Production planning, summary and variance',
  },
  hr: {
    icon: <TeamOutlined />,
    color: '#be123c',
    bg: '#fff1f2',
    description: 'Employees, attendance, leave and payroll reports',
  },
  system: {
    icon: <AuditOutlined />,
    color: '#475569',
    bg: '#f8fafc',
    description: 'Activity logs, user logs and audit reports',
  },
  analytics: {
    icon: <PieChartOutlined />,
    color: '#ca8a04',
    bg: '#fefce8',
    description: 'Ratios, exceptions and management analytics',
  },
  default: {
    icon: <FileSearchOutlined />,
    color: token.colorPrimary,
    bg: token.colorPrimaryBg,
    description: 'Business report group',
  },
});

export default function ReportsIndex() {
  const { token } = theme.useToken();
  const [search, setSearch] = useState('');
  const permissions = usePage().props.auth?.permissions || [];

  const categoryMeta = useMemo(() => createCategoryMeta(token), [token]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return REPORT_CATEGORIES
      .filter((category) => hasReportPermission(permissions, category.permission))
      .map((category) => ({
        ...category,
        reports: category.reports.filter(
          ([, reportTitle]) =>
            !query ||
            `${category.title} ${reportTitle}`.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.reports.length > 0);
  }, [permissions, search]);

  const totalReports = useMemo(
    () => visibleCategories.reduce((total, category) => total + category.reports.length, 0),
    [visibleCategories],
  );

  return (
    <AuthenticatedLayout
      
    >
      <Head title="Reports" />
 
      <style>
        {`
          .reports-page {
            padding: 20px;
          }

          .reports-hero {
            border: 1px solid ${token.colorBorderSecondary};
            box-shadow: ${token.boxShadowTertiary};
          }

          .report-card {
            height: 100%;
            border: 1px solid ${token.colorBorderSecondary};
            box-shadow: ${token.boxShadowTertiary};
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
          }

          .report-card:hover {
            transform: translateY(-2px);
            box-shadow: ${token.boxShadowSecondary};
            border-color: ${token.colorBorder};
          }

          .report-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            padding: 8px 10px;
            
            color: ${token.colorText};
            font-weight: 500;
            line-height: 1.35;
            transition: background 140ms ease, color 140ms ease;
          }

          .report-link:hover {
            background: ${token.colorFillTertiary};
            color: ${token.colorPrimary};
          }

          .report-link-title {
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .report-dot {
            width: 7px;
            height: 7px;
            flex: 0 0 7px;
            border-radius: 999px;
          }

          @media (max-width: 768px) {
            .reports-page {
              padding: 12px;
            }

            .reports-hero-body {
              gap: 14px;
            }
          }
        `}
      </style>

      <div
        className="reports-page"
        style={{
          background: token.colorBgLayout,
          minHeight: 'calc(100vh - 96px)',
        }}
      >
        <Card
          bordered={false}
          className="reports-hero"
          styles={{
            body: {
              padding: 20,
            },
          }}
          style={{
            marginBottom: 16,
            background: token.colorBgContainer,
            
          }}
        >
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} lg={14}>
              <Space
                direction="vertical"
                size={6}
                className="reports-hero-body"
                style={{ width: '100%' }}
              >
                <Space size={10} align="center">
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: token.colorPrimaryBg,
                      color: token.colorPrimary,
                      fontSize: 22,
                    }}
                  >
                    <BarChartOutlined />
                  </span>

                  <div>
                    <Title level={3} style={{ margin: 0, letterSpacing: -0.3 }}>
                      Reports
                    </Title>
                    <Text type="secondary">
                      Finance, sales, purchase, tax, inventory, HR, system and analytics reports.
                    </Text>
                  </div>
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={10}>
              <Space
                direction="vertical"
                size={10}
                style={{
                  width: '100%',
                  alignItems: 'flex-end',
                }}
              >
                <Search
                  allowClear
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', maxWidth: 420 }}
                />

                <Space size={8} wrap>
                  <Tag color="blue">{visibleCategories.length} Groups</Tag>
                  <Tag color="green">{totalReports} Reports</Tag>
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>

        {visibleCategories.length === 0 ? (
          <Card
            bordered={false}
            style={{
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No reports found"
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]} align="stretch">
            {visibleCategories.map((category) => {
              const meta = categoryMeta[category.key] || categoryMeta.default;

              return (
                <Col xs={24} sm={12} lg={8} xxl={6} key={category.key}>
                  <Card
                    bordered={false}
                    className="report-card"
                    styles={{
                      body: {
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      },
                    }}
                    style={{
                      background: token.colorBgContainer,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 14,
                        minHeight: 72,
                      }}
                    >
                      <Space align="start" size={12}>
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 15,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: meta.bg || hexToRgba(meta.color, 0.1),
                            color: meta.color,
                            fontSize: 22,
                            flex: '0 0 44px',
                          }}
                        >
                          {meta.icon}
                        </span>

                        <div style={{ minWidth: 0 }}>
                          <Title
                            level={5}
                            style={{
                              margin: 0,
                              color: token.colorText,
                              lineHeight: 1.25,
                            }}
                          >
                            {category.title}
                          </Title>

                          <Text
                            type="secondary"
                            style={{
                              display: 'block',
                              fontSize: 12,
                              marginTop: 4,
                              lineHeight: 1.35,
                            }}
                          >
                            {meta.description}
                          </Text>
                        </div>
                      </Space>

                      <Tag
                        style={{
                          marginInlineEnd: 0,
                          borderRadius: 999,
                          color: meta.color,
                          background: hexToRgba(meta.color, 0.08),
                          borderColor: hexToRgba(meta.color, 0.24),
                          fontWeight: 600,
                        }}
                      >
                        {category.reports.length}
                      </Tag>
                    </div>

                    <List
                      size="small"
                      dataSource={category.reports}
                      split={false}
                      style={{ marginTop: 'auto' }}
                      renderItem={([reportKey, reportTitle]) => (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Link
                            href={`/reports/${category.key}/${reportKey}`}
                            className="report-link"
                          >
                            <Space size={8} style={{ minWidth: 0 }}>
                              <span
                                className="report-dot"
                                style={{ background: meta.color }}
                              />
                              <span className="report-link-title">
                                {reportTitle}
                              </span>
                            </Space>

                            <span
                              style={{
                                color: token.colorTextTertiary,
                                fontSize: 13,
                              }}
                            >
                              →
                            </span>
                          </Link>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </AuthenticatedLayout>
  );
}