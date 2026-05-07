import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function LateAttendance() {
  const config = REPORT_CONFIG['hr/late-attendance'];

  return <ReportPage {...config} />;
}
