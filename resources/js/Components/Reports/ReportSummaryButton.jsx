import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import ReportSummaryDrawer from './ReportSummaryDrawer.jsx';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

export default function ReportSummaryButton({
  category,
  reportKey,
  title,
  filters,
  columns,
  rows,
  totals,
  summaryBlocks,
  chartData,
  generatedAt,
  disabled,
  canSummarize,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const buttonDisabled = disabled || !canSummarize;
  const tooltip = !canSummarize
    ? 'Permission required: reports.ai_summary'
    : disabled
      ? 'Generate the report before summarizing it.'
      : 'Summarize this report';

  const loadSummary = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(api('/api/reports/summarize'), {
        category,
        report_key: reportKey,
        title,
        filters,
        columns,
        rows,
        totals,
        summary_blocks: summaryBlocks,
        chart_data: chartData,
        generated_at: generatedAt,
      });
      setData(response.data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not summarize this report.';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <Button
          icon={<FileSearchOutlined />}
          disabled={buttonDisabled}
          loading={loading}
          onClick={loadSummary}
        >
          Summarize
        </Button>
      </Tooltip>

      <ReportSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        loading={loading}
        error={error}
        data={data}
        reportTitle={title}
      />
    </>
  );
}
