import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SupplierPayableSummary() {
  const config = REPORT_CONFIG['payable/supplier-payable-summary'];

  return <ReportPage {...config} />;
}
