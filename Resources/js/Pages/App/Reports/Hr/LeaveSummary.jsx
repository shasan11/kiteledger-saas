import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function LeaveSummary() {
  const config = REPORT_CONFIG['hr/leave-summary'];

  return <ReportPage {...config} />;
}
