import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, Col, Row, Table, Typography } from 'antd';
import { ChartCard, CrmPage, MetricGrid, SmallTag } from '../Shared/CrmWidgets';
import { dateText, getJson, money } from '../Shared/crmApi';

const metricHref = {
  leads_created_this_week: '/crm/leads#all',
  open_leads: '/crm/leads#new',
  followups_due_today: '/crm/activity-inbox?bucket=today',
  overdue_activities: '/crm/activity-inbox?bucket=overdue',
  deals_at_risk: '/crm/deals?stuck=1',
  open_pipeline_value: '/crm/deals#open',
  weighted_forecast_this_month: '/crm/forecast',
  won_deals_this_month: '/crm/deals#won',
  lost_deals_this_month: '/crm/deals#lost',
  win_rate: '/crm/forecast',
};

const metricTitle = {
  leads_created_this_week: 'Leads This Week',
  open_leads: 'Open Leads',
  followups_due_today: 'Due Today',
  overdue_activities: 'Overdue Activities',
  deals_at_risk: 'Deals at Risk',
  open_pipeline_value: 'Open Pipeline',
  weighted_forecast_this_month: 'Weighted Forecast',
  won_deals_this_month: 'Won This Month',
  lost_deals_this_month: 'Lost This Month',
  win_rate: 'Win Rate',
};

export default function CrmHome({ auth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson('/api/crm/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  const metrics = Object.entries(data?.metrics || {}).map(([key, value]) => ({
    key,
    title: metricTitle[key] || key,
    value,
    href: metricHref[key],
    suffix: key === 'win_rate' ? '%' : undefined,
    precision: key.includes('value') || key.includes('forecast') ? 2 : undefined,
  }));

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="CRM Home" />
      <CrmPage title="CRM Home">
        <MetricGrid metrics={metrics} />

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={8}>
            <ChartCard title="Lead Source" data={data?.charts?.lead_source_breakdown || []} type="pie" loading={loading} />
          </Col>
          <Col xs={24} lg={8}>
            <ChartCard title="Deals by Stage" data={data?.charts?.deals_by_stage || []} valueKey="value" loading={loading} />
          </Col>
          <Col xs={24} lg={8}>
            <ChartCard title="Forecast by Month" data={(data?.charts?.forecast_by_month || []).map((r) => ({ ...r, name: r.month }))} valueKey="weighted" type="line" loading={loading} />
          </Col>
          <Col xs={24} lg={12}>
            <ChartCard title="Win/Loss Trend" data={(data?.charts?.win_loss_trend || []).map((r) => ({ ...r, name: r.month, count: Number(r.won || 0) - Number(r.lost || 0) }))} loading={loading} />
          </Col>
          <Col xs={24} lg={12}>
            <ChartCard title="Activity Status" data={data?.charts?.activity_completion_status || []} loading={loading} />
          </Col>
        </Row>

        <Card size="small" title="Top Overdue Customer Responses">
          <Table
            size="small"
            loading={loading}
            rowKey="id"
            dataSource={data?.top_overdue_customer_responses || []}
            pagination={false}
            onRow={(record) => ({ onClick: () => router.visit(`/crm/activities/${record.id}`), style: { cursor: 'pointer' } })}
            columns={[
              { title: 'Activity', dataIndex: 'subject', render: (value, row) => <><Typography.Text strong>{value}</Typography.Text><br /><Typography.Text type="secondary">{row.contact?.name || row.lead?.name || row.deal?.title || '-'}</Typography.Text></> },
              { title: 'Due', dataIndex: 'due_at', width: 140, render: dateText },
              { title: 'Priority', dataIndex: 'priority', width: 120, render: (value) => <SmallTag value={value} /> },
              { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <SmallTag value={value} /> },
            ]}
          />
        </Card>
      </CrmPage>
    </AuthenticatedLayout>
  );
}
