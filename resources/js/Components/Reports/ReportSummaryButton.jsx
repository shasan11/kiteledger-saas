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
  reportTitle,
  filters = {},
  columns = [],
  rows = [],
  totals = {},
  summaryCards = [],
  metadata = {},
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadSummary = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        api(`/api/reports/${category}/${reportKey}/ai-summary`),
        {
          filters,
          columns: columns.slice(0, 30).map((column) => ({
            key: column.key,
            title: String(column.title || column.key || ''),
          })),
          rows: rows.slice(0, 100),
          totals,
          summary_cards: summaryCards,
          metadata: {
            ...metadata,
            row_count: rows.length,
          },
        },
      );

      setData(response.data?.data || null);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message;
      const friendlyMessage = apiMessage || 'Unable to generate summary right now. Please try again.';
      setError(friendlyMessage);
      message.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={disabled ? 'Generate the report before requesting an AI summary.' : 'Summarize the generated report'}>
        <Button
          icon={<FileSearchOutlined />}
          disabled={disabled}
          loading={loading}
          onClick={loadSummary}
        >
          AI Summary
        </Button>
      </Tooltip>

      <ReportSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        onRegenerate={loadSummary}
        loading={loading}
        error={error}
        data={data}
        reportTitle={reportTitle}
        filters={filters}
      />
    </>
  );
}
