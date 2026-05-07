import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function CustomerAgeingSummary() {
  const config = REPORT_CONFIG['receivable/customer-ageing-summary'];

  return <ReportPage {...config} />;
}
