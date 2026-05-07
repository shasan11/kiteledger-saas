import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function AnalyticsReport() {
  const config = REPORT_CONFIG['analytics/analytics-report'];

  return <ReportPage {...config} />;
}
