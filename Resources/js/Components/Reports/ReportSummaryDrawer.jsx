import { Alert, Divider, Drawer, Skeleton, Space, Tag, Typography } from 'antd';
import ReportSummaryCards from './ReportSummaryCards.jsx';
import ReportSummaryLists from './ReportSummaryLists.jsx';

const { Paragraph, Text, Title } = Typography;

export default function ReportSummaryDrawer({ open, onClose, loading, error, data, reportTitle }) {
  return (
    <Drawer
      title="AI Report Summary"
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose={false}
    >
      {loading && <Skeleton active paragraph={{ rows: 8 }} />}

      {!loading && error && (
        <Alert type="error" showIcon message="Summary unavailable" description={error} />
      )}

      {!loading && !error && data && (
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          {data.ai_unavailable && (
            <Alert
              type="warning"
              showIcon
              message="Local summary prepared"
              description="The AI provider was unavailable, so KiteLedger prepared a summary from the report data on this page."
            />
          )}

          <div>
            <Space size={8} wrap style={{ marginBottom: 8 }}>
              <Tag color="blue">{reportTitle || 'Report'}</Tag>
              {data.cached && <Tag>Cached</Tag>}
            </Space>
            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
              Executive Summary
            </Title>
            <Paragraph style={{ marginBottom: 0 }}>
              {data.summary || 'No summary was generated for this report.'}
            </Paragraph>
          </div>

          <ReportSummaryCards items={data.key_numbers || []} />

          <Divider style={{ margin: '4px 0' }} />

          <ReportSummaryLists title="Observations" items={data.observations || []} />
          <ReportSummaryLists title="Risks to Review" items={data.risks || []} />
          <ReportSummaryLists title="Suggested Actions" items={data.actions || []} />

          {data.source_note && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.source_note}
            </Text>
          )}
        </Space>
      )}
    </Drawer>
  );
}
