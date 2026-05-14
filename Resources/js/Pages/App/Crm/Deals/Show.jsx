import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button, Card, Col, Row, Space, Table, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { CrmPage, SmallTag } from '../Shared/CrmWidgets';
import { dateText, getJson, money, rowsFrom } from '../Shared/crmApi';

export default function DealShow({ auth, id }) {
  const [deal, setDeal] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getJson(`/api/deals/${id}`).then(setDeal);
    getJson(`/api/crm/deals/${id}/stage-history`).then((data) => setHistory(rowsFrom(data)));
  }, [id]);

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={deal?.title || 'Deal'} />
      <CrmPage title={deal?.title || 'Deal'} extra={<Space><Button icon={<ArrowLeftOutlined />} onClick={() => router.visit('/crm/deals')}>Deals</Button><Button type="primary" icon={<FileTextOutlined />} onClick={() => router.visit(`/payment-in/quotations/add?deal_id=${id}`)}>Create Quotation</Button></Space>}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}><Card size="small"><Typography.Text type="secondary">Amount</Typography.Text><Typography.Title level={3}>{money(deal?.amount)}</Typography.Title></Card></Col>
          <Col xs={24} md={6}><Card size="small"><Typography.Text type="secondary">Probability</Typography.Text><Typography.Title level={3}>{deal?.probability || 0}%</Typography.Title></Card></Col>
          <Col xs={24} md={6}><Card size="small"><Typography.Text type="secondary">Expected Close</Typography.Text><Typography.Title level={3}>{dateText(deal?.expected_close_date)}</Typography.Title></Card></Col>
          <Col xs={24} md={6}><Card size="small"><Typography.Text type="secondary">Status</Typography.Text><br /><SmallTag value={deal?.status} /></Card></Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Commercial Context">
              <Table size="small" pagination={false} dataSource={[
                ['Deal No', deal?.deal_no],
                ['Stage', deal?.deal_stage?.name || deal?.dealStage?.name],
                ['Pipeline', deal?.deal_pipeline?.name || deal?.dealPipeline?.name],
                ['Source', deal?.source],
                ['Lost Reason', deal?.lost_reason],
              ].map(([label, value]) => ({ label, value }))} columns={[{ title: 'Field', dataIndex: 'label' }, { title: 'Value', dataIndex: 'value', render: (v) => v || '-' }]} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="Stage History">
              <Timeline items={history.map((row) => ({ children: `${row.from_stage?.name || 'Start'} to ${row.to_stage?.name || 'Unassigned'} on ${dateText(row.changed_at)}` }))} />
            </Card>
          </Col>
        </Row>
      </CrmPage>
    </AuthenticatedLayout>
  );
}
