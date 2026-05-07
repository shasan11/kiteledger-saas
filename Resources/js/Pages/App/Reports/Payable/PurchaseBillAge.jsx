import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseBillAge() {
  const config = REPORT_CONFIG['payable/purchase-bill-age'];

  return <ReportPage {...config} />;
}
