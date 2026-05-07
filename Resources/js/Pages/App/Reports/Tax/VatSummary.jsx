import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function VatSummary() {
  const config = REPORT_CONFIG['tax/vat-summary'];

  return <ReportPage {...config} />;
}
