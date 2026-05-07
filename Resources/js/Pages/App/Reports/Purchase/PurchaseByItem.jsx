import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseByItem() {
  const config = REPORT_CONFIG['purchase/purchase-by-item'];

  return <ReportPage {...config} />;
}
