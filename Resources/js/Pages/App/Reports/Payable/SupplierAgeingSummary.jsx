import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SupplierAgeingSummary() {
  const config = REPORT_CONFIG['payable/supplier-ageing-summary'];

  return <ReportPage {...config} />;
}
