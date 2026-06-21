import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, Col, Row, Space, Statistic, Table, Tag, Typography, theme } from 'antd';
import { dateText, getJson, money } from '../Shared/crmApi';

const { Text, Title } = Typography;

const metricCards = [
  ['total_leads', 'Total Leads'],
  ['new_leads', 'New Leads'],
  ['qualified_leads', 'Qualified Leads'],
  ['converted_leads', 'Converted Leads'],
  ['lost_leads', 'Lost Leads'],
  ['open_deals', 'Open Deals'],
  ['pipeline_value', 'Pipeline Value', 'money'],
  ['weighted_forecast', 'Weighted Forecast', 'money'],
  ['overdue_activities', 'Overdue Activities'],
  ['upcoming_activities', 'Upcoming Activities'],
  ['stuck_deals', 'Stuck Deals'],
];

const tagColor = {
  pending: 'warning',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'default',
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const labelize = (value) => String(value || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function CrmHome({ auth }) {
  const { token } = theme.useToken();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson('/api/crm/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {};
  const stuckRows = data?.charts?.deals_by_stage || [];
  const activityRows = data?.top_overdue_customer_responses || [];

  const header = (
    <Space direction="vertical" size={0}>
      <Title level={4} style={{ margin: 0 }}>CRM Dashboard</Title>
      <Text type="secondary">Lead, pipeline, and activity health at a glance.</Text>
    </Space>
  );

  return (
    <AuthenticatedLayout user={auth?.user} header={header}>
      <Head title="CRM Dashboard" />

      <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 104px)' }}>
        <Space direction="vertical" size={token.paddingSM} style={{ width: '100%' }}>
          <Row gutter={[10, 10]}>
            {metricCards.map(([key, title, type]) => (
              <Col xs={12} sm={8} lg={6} xl={4} key={key}>
                <Card size="small" loading={loading} style={{ borderColor: token.colorBorderSecondary }}>
                  <Statistic
                    title={title}
                    value={type === 'money' ? money(metrics[key] || 0) : metrics[key] || 0}
                    valueStyle={{ fontSize: 18 }}
                    formatter={type === 'money' ? (value) => value : undefined}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <Card size="small" title="Open Pipeline by Stage" loading={loading}>
                <Table
                  size="small"
                  rowKey={(record) => record.name}
                  dataSource={stuckRows}
                  pagination={false}
                  columns={[
                    { title: 'Stage', dataIndex: 'name' },
                    { title: 'Deals', dataIndex: 'count', width: 90, align: 'right' },
                    { title: 'Value', dataIndex: 'value', width: 140, align: 'right', render: money },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="Overdue Activities" loading={loading}>
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={activityRows}
                  pagination={false}
                  onRow={(record) => ({ onClick: () => router.visit(`/crm/activities/${record.id}`), style: { cursor: 'pointer' } })}
                  columns={[
                    {
                      title: 'Activity',
                      dataIndex: 'subject',
                      render: (value, row) => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{value || '-'}</Text>
                          <Text type="secondary">{row.contact?.name || row.lead?.name || row.deal?.title || '-'}</Text>
                        </Space>
                      ),
                    },
                    { title: 'Due', dataIndex: 'due_at', width: 120, render: dateText },
                    { title: 'Priority', dataIndex: 'priority', width: 100, render: (value) => <Tag color={tagColor[value]}>{labelize(value)}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 110, render: (value) => <Tag color={tagColor[value]}>{labelize(value)}</Tag> },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      </div>
    </AuthenticatedLayout>
  );
}
