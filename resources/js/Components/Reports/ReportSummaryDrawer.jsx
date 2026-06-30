import {
  Alert,
  Button,
  Divider,
  Drawer,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import ReportSummaryLists from './ReportSummaryLists.jsx';

const { Paragraph, Text, Title } = Typography;

function summaryAsText(summary, reportTitle) {
  const sections = [
    [reportTitle || 'Report', [summary.executive_summary]],
    ['Key Numbers', summary.key_numbers],
    ['Notable Trends', summary.trends],
    ['Risks or Anomalies', summary.risks],
    ['Suggested Actions', summary.recommended_actions],
    ['Disclaimer', [summary.disclaimer]],
  ];

  return sections
    .filter(([, items]) => Array.isArray(items) && items.filter(Boolean).length)
    .map(([title, items]) => `${title}\n${items.filter(Boolean).map((item) => `- ${item}`).join('\n')}`)
    .join('\n\n');
}

export default function ReportSummaryDrawer({
  open,
  onClose,
  onRegenerate,
  loading,
  error,
  data,
  reportTitle,
  filters = {},
}) {
  const summary = data?.summary;
  const period = filters.date_from && filters.date_to
    ? `${filters.date_from} to ${filters.date_to}`
    : filters.as_of_date || filters.ageing_as_of_date;

  const copySummary = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summaryAsText(summary, reportTitle));
      message.success('AI report summary copied.');
    } catch {
      message.error('Could not copy the summary.');
    }
  };

  return (
    <Drawer
      title="AI Report Summary"
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose={false}
      extra={(
        <Space>
          <Button icon={<CopyOutlined />} onClick={copySummary} disabled={!summary || loading}>
            Copy
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onRegenerate} loading={loading} disabled={!data && loading}>
            Regenerate
          </Button>
        </Space>
      )}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space size={8} wrap>
          <Tag color="blue">{reportTitle || 'Report'}</Tag>
          {period && <Tag>{period}</Tag>}
          {data?.meta?.cached && <Tag color="default">Cached</Tag>}
          {data?.meta?.sampled_row_count < data?.meta?.row_count && (
            <Tag color="gold">Sampled {data.meta.sampled_row_count} of {data.meta.row_count} rows</Tag>
          )}
        </Space>

        {loading && <Skeleton active paragraph={{ rows: 9 }} />}

        {!loading && error && (
          <Alert type="error" showIcon message="Summary unavailable" description={error} />
        )}

        {!loading && !error && summary && (
          <>
            <div>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Executive Summary</Title>
              <Paragraph style={{ marginBottom: 0 }}>
                {summary.executive_summary || 'No executive summary was returned.'}
              </Paragraph>
            </div>

            <Divider style={{ margin: '2px 0' }} />
            <ReportSummaryLists title="Key Numbers" items={summary.key_numbers || []} />
            <ReportSummaryLists title="Notable Trends" items={summary.trends || []} />
            <ReportSummaryLists title="Risks or Anomalies" items={summary.risks || []} />
            <ReportSummaryLists title="Suggested Actions" items={summary.recommended_actions || []} />

            <Alert
              type="info"
              showIcon
              message={<Text type="secondary">{summary.disclaimer}</Text>}
            />
          </>
        )}
      </Space>
    </Drawer>
  );
}
