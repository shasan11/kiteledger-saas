import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function AttendanceDetail() {
  const config = REPORT_CONFIG['hr/attendance-detail'];

  return <ReportPage {...config} />;
}
