import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function AttendanceSummary() {
  const config = REPORT_CONFIG['hr/attendance-summary'];

  return <ReportPage {...config} />;
}
