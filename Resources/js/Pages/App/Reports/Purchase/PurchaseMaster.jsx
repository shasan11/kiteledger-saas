import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseMaster() {
  const config = REPORT_CONFIG['purchase/purchase-master'];

  return <ReportPage {...config} />;
}
