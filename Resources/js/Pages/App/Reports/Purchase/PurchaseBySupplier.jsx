import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseBySupplier() {
  const config = REPORT_CONFIG['purchase/purchase-by-supplier'];

  return <ReportPage {...config} />;
}
