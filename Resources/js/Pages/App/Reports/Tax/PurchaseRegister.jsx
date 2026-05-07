import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseRegister() {
  const config = REPORT_CONFIG['tax/purchase-register'];

  return <ReportPage {...config} />;
}
