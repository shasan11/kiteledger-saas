import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function LeaveBalance() {
  const config = REPORT_CONFIG['hr/leave-balance'];

  return <ReportPage {...config} />;
}
