import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function CustomerReceivableSummary() {
  const config = REPORT_CONFIG['receivable/customer-receivable-summary'];

  return <ReportPage {...config} />;
}
