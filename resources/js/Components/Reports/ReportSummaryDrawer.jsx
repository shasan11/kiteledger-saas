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
  const scope = data?.data_scope || {};
  /*
   * Server-computed figures, each carrying its own currency and a `verified`
   * flag. These are read straight from the deterministic analytics, not from
   * the model's prose, so they are rendered as data rather than as bullets.
   */
  const verifiedNumbers = Array.isArray(data?.key_numbers) ? data.key_numbers : [];
  const period = scope.date_range?.from && scope.date_range?.to
    ? `${scope.date_range.from} to ${scope.date_range.to}`
    : (filters.date_from && filters.date_to
      ? `${filters.date_from} to ${filters.date_to}`
      : filters.as_of_date || filters.ageing_as_of_date);

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
          {scope.branch && <Tag>{scope.branch}</Tag>}
          {scope.currency && <Tag>{scope.currency}</Tag>}
          {typeof data?.meta?.row_count === 'number' && (
            <Tag color="green">{data.meta.row_count} rows analyzed</Tag>
          )}
          {data?.cached && <Tag color="default">Cached</Tag>}
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

            {verifiedNumbers.length > 0 ? (
              <div>
                <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Key Numbers</Title>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {verifiedNumbers.map((number) => (
                    <div
                      key={number.label}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
                    >
                      <Text type="secondary">{number.label}</Text>
                      <Text strong>{number.formatted}</Text>
                    </div>
                  ))}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Calculated from your data, not written by the AI.
                </Text>
              </div>
            ) : (
              <ReportSummaryLists title="Key Numbers" items={summary.key_numbers || []} />
            )}

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
