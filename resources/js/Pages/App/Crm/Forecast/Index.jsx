import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, Col, Row, Segmented, Statistic, Table } from 'antd';
import { ChartCard, CrmPage } from '../Shared/CrmWidgets';
import { getJson, money } from '../Shared/crmApi';

export default function Forecast({ auth }) {
  const [period, setPeriod] = useState('this_month');
  const [data, setData] = useState(null);

  useEffect(() => {
    getJson('/api/crm/deals/forecast', { period }).then(setData);
  }, [period]);

  const totals = data?.totals || {};

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="CRM Forecast" />
      <CrmPage title="Forecast" extra={<Segmented value={period} onChange={setPeriod} options={[{ label: 'This Month', value: 'this_month' }, { label: 'Next Month', value: 'next_month' }, { label: 'This Quarter', value: 'this_quarter' }]} />}>
        <Row gutter={[12, 12]}>
          {[
            ['Pipeline Value', totals.pipeline_value],
            ['Weighted Forecast', totals.weighted_forecast],
            ['Committed', totals.committed_forecast],
            ['Best Case', totals.best_case_forecast],
            ['Won Revenue', totals.won_revenue],
          ].map(([title, value]) => <Col xs={12} md={8} xl={4} key={title}><Card size="small"><Statistic title={title} value={value || 0} precision={2} /></Card></Col>)}
        </Row>
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={12}><ChartCard title="Weighted Forecast by Stage" data={data?.by_stage || []} nameKey="stage" valueKey="weighted" /></Col>
          <Col xs={24} lg={12}><ChartCard title="Forecast Waterfall" data={data?.by_stage || []} nameKey="stage" valueKey="value" /></Col>
        </Row>
        <Card size="small" title="Owner Forecast">
          <Table size="small" rowKey="owner" dataSource={data?.by_owner || []} pagination={false} columns={[
            { title: 'Owner', dataIndex: 'owner' },
            { title: 'Pipeline', dataIndex: 'pipeline', align: 'right', render: money },
            { title: 'Weighted', dataIndex: 'weighted', align: 'right', render: money },
            { title: 'Won', dataIndex: 'won', align: 'right', render: money },
          ]} />
        </Card>
      </CrmPage>
    </AuthenticatedLayout>
  );
}
