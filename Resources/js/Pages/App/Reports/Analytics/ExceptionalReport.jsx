import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ExceptionalReport() {
  const config = REPORT_CONFIG['analytics/exceptional-report'];

  return <ReportPage {...config} />;
}
