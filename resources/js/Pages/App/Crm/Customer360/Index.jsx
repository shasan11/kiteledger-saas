import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Alert, Avatar, Button, Card, Col, Empty, Row, Space, Statistic, Table, Tabs, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { CrmPage, SmallTag } from '../Shared/CrmWidgets';
import { dateText, getJson, labelize, money, rowsFrom } from '../Shared/crmApi';

const { Text, Title } = Typography;

const initials = (value = '') => value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'A';

function SimpleTable({ rows = [], columns = [], empty = 'No records' }) {
  return <Table size="small" rowKey={(row, i) => row.id || i} dataSource={rows} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} /> }} scroll={{ x: 800 }} />;
}

export default function Customer360({ auth, id }) {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [commercials, setCommercials] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getJson(`/api/crm/accounts/${id}/summary`),
      getJson(`/api/crm/customers/${id}/timeline`),
      getJson(`/api/crm/accounts/${id}/commercials`),
    ]).then(([summaryData, timelineData, commercialData]) => {
      setSummary(summaryData);
      setTimeline(rowsFrom(timelineData));
      setCommercials(commercialData);
    }).finally(() => setLoading(false));
  }, [id]);

  const account = summary?.account || {};
  const commercial = summary?.commercials || {};
  const health = summary?.health || {};

  const documentColumns = (numberKey, dateKey, amountKey = 'total') => [
    { title: 'Document', dataIndex: numberKey, render: (value) => <Text strong>{value || '-'}</Text> },
    { title: 'Date', dataIndex: dateKey, width: 130, render: dateText },
    { title: 'Amount', dataIndex: amountKey, width: 130, align: 'right', render: money },
    { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <SmallTag value={value} /> },
  ];

  const tabs = [
    {
      key: 'timeline',
      label: 'Timeline',
      children: (
        <Card size="small">
          {timeline.length ? (
            <Timeline
              items={timeline.map((item) => ({
                children: (
                  <Space direction="vertical" size={2}>
                    <Space><SmallTag value={item.type} /><Text strong>{item.title}</Text></Space>
                    <Text type="secondary">{dateText(item.date)} · {labelize(item.status)}</Text>
                    {item.description ? <Text>{item.description}</Text> : null}
                  </Space>
                ),
              }))}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No timeline yet" />}
        </Card>
      ),
    },
    { key: 'deals', label: 'Deals', children: <SimpleTable rows={account.deals || []} columns={documentColumns('title', 'expected_close_date', 'amount')} /> },
    { key: 'activities', label: 'Activities', children: <SimpleTable rows={account.activities || []} columns={[
      { title: 'Activity', dataIndex: 'subject', render: (value) => <Text strong>{value || '-'}</Text> },
      { title: 'Due', dataIndex: 'due_at', width: 130, render: dateText },
      { title: 'Priority', dataIndex: 'priority', width: 120, render: (value) => <SmallTag value={value} /> },
      { title: 'Status', dataIndex: 'status', width: 120, render: (value) => <SmallTag value={value} /> },
    ]} /> },
    { key: 'quotations', label: 'Quotations', children: <SimpleTable rows={commercials.quotations || []} columns={documentColumns('quotation_no', 'quotation_date')} /> },
    { key: 'invoices', label: 'Invoices', children: <SimpleTable rows={commercials.invoices || []} columns={documentColumns('invoice_no', 'invoice_date')} /> },
    { key: 'payments', label: 'Payments', children: <SimpleTable rows={commercials.payments || []} columns={documentColumns('payment_no', 'payment_date', 'amount')} /> },
    { key: 'notes', label: 'Notes', children: <Card size="small"><Text>{account.remarks || 'No notes yet.'}</Text></Card> },
    { key: 'files', label: 'Files', children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files attached" /> },
    {
      key: 'contacts',
      label: 'Contacts / Roles',
      children: <SimpleTable rows={account.contact_roles || account.contactRoles || []} columns={[
        { title: 'Contact', render: (_, row) => row.contact?.name || '-' },
        { title: 'Role', dataIndex: 'role', render: (value) => <SmallTag value={value} /> },
        { title: 'Primary', dataIndex: 'is_primary', render: (value) => value ? 'Yes' : 'No' },
        { title: 'Remarks', dataIndex: 'remarks' },
      ]} />,
    },
    {
      key: 'health',
      label: 'Health',
      children: (
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}><Card size="small"><Statistic title="Health Score" value={health.score || 0} suffix="/100" /></Card></Col>
          <Col xs={24} md={8}><Card size="small"><Statistic title="Open Invoices" value={summary?.counts?.open_invoices || 0} /></Card></Col>
          <Col xs={24} md={8}><Card size="small"><Statistic title="Overdue Amount" value={commercial.overdue_invoice_amount || 0} precision={2} /></Card></Col>
          <Col span={24}><Alert type={health.status === 'healthy' ? 'success' : 'warning'} showIcon message={labelize(health.status)} description={health.reason} /></Col>
        </Row>
      ),
    },
  ];

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title={`${account.name || 'Customer'} 360`} />
      <CrmPage
        title="Customer 360"
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => router.visit('/crm/accounts')}>Accounts</Button>}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={6}>
            <Card loading={loading} size="small">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space>
                  <Avatar size={48}>{initials(account.name)}</Avatar>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>{account.name || '-'}</Title>
                    <Text type="secondary">{account.account_no || account.segment || 'Account'}</Text>
                  </div>
                </Space>
                <Space wrap>
                  <SmallTag value={account.status} />
                  <SmallTag value={health.status} />
                </Space>
                <Text><PhoneOutlined /> {account.phone || '-'}</Text>
                <Text><MailOutlined /> {account.email || '-'}</Text>
                <Text><CalendarOutlined /> Last interaction: {dateText(summary?.last_interaction_at)}</Text>
                <Card size="small" title="Next Best Action">
                  <Text strong>{summary?.next_best_action?.title || '-'}</Text><br />
                  <SmallTag value={summary?.next_best_action?.priority} />
                </Card>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={18}>
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}><Card size="small"><Statistic title="Pipeline" value={commercial.open_pipeline_value || 0} precision={2} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="Won Revenue" value={commercial.won_revenue || 0} precision={2} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="Receivables" value={commercial.outstanding_receivables || 0} precision={2} /></Card></Col>
              <Col xs={12} md={6}><Card size="small"><Statistic title="Credit Exposure" value={commercial.credit_exposure || 0} precision={2} /></Card></Col>
              <Col span={24}><Tabs defaultActiveKey="timeline" items={tabs} /></Col>
            </Row>
          </Col>
        </Row>
      </CrmPage>
    </AuthenticatedLayout>
  );
}
