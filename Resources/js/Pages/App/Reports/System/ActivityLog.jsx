import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ActivityLog() {
  const config = REPORT_CONFIG['system/activity-log'];

  return <ReportPage {...config} />;
}
