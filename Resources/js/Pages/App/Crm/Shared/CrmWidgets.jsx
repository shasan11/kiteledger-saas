import { Card, Col, Empty, Row, Skeleton, Space, Statistic, Tag, Typography, theme } from 'antd';
import { Link } from '@inertiajs/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { labelize, money } from './crmApi';

const { Text } = Typography;

export function statusColor(value) {
  return {
    active: 'success',
    customer: 'success',
    healthy: 'success',
    won: 'success',
    completed: 'success',
    open: 'processing',
    prospect: 'processing',
    pending: 'warning',
    at_risk: 'warning',
    high: 'warning',
    lost: 'error',
    overdue: 'error',
    churn_risk: 'error',
    urgent: 'error',
  }[value] || 'default';
}

export function CrmPage({ title, extra, children }) {
  const { token } = theme.useToken();

  return (
    <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 64px)' }}>
      <Space direction="vertical" size={token.padding} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: token.paddingSM, alignItems: 'center' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>
          {extra}
        </div>
        {children}
      </Space>
    </div>
  );
}

export function MetricGrid({ metrics = [] }) {
  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric) => (
        <Col xs={12} md={8} xl={6} xxl={4} key={metric.key}>
          <Link href={metric.href || '#'}>
            <Card size="small" hoverable>
              <Statistic
                title={metric.title}
                value={metric.value ?? 0}
                precision={metric.precision}
                suffix={metric.suffix}
                valueStyle={{ fontSize: 20 }}
              />
              {metric.caption ? <Text type="secondary">{metric.caption}</Text> : null}
            </Card>
          </Link>
        </Col>
      ))}
    </Row>
  );
}

export function SmallTag({ value }) {
  return <Tag color={statusColor(value)}>{labelize(value)}</Tag>;
}

export function ChartCard({ title, data = [], type = 'bar', valueKey = 'count', nameKey = 'name', loading = false }) {
  const { token } = theme.useToken();
  const colors = [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo, token.colorTextSecondary];

  return (
    <Card size="small" title={title}>
      {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : data.length ? (
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'pie' ? (
              <PieChart>
                <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={48} outerRadius={82} paddingAngle={2}>
                  {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            ) : type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                <XAxis dataKey={nameKey} />
                <YAxis />
                <Tooltip formatter={(value) => money(value)} />
                <Line type="monotone" dataKey={valueKey} stroke={token.colorPrimary} strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                <XAxis dataKey={nameKey} />
                <YAxis />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey={valueKey} fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
      )}
    </Card>
  );
}
