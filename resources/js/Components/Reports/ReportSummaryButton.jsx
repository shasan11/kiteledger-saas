import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import ReportSummaryDrawer from './ReportSummaryDrawer.jsx';

const BACKEND_BASE = import.meta.env.VITE_APP_BACKEND_URL || '';
const api = (path) => `${BACKEND_BASE}${path}`;

/*
 * The summary request carries only *what* to summarize — the report and its
 * filters. It deliberately does not send rows, totals or summary cards: the
 * server re-runs the report through the same engine that produced the table on
 * screen, so the AI's figures cannot be influenced by anything the browser
 * says. `rows` is still accepted as a prop purely to render the row count in
 * the drawer while the request is in flight.
 */
export default function ReportSummaryButton({
  category,
  reportKey,
  reportTitle,
  filters = {},
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
        { filters },
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
