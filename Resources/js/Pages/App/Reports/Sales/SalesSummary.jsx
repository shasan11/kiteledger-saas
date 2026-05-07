import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesSummary() {
  const config = REPORT_CONFIG['sales/sales-summary'];

  return <ReportPage {...config} />;
}
