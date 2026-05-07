import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseReturnRegister() {
  const config = REPORT_CONFIG['tax/purchase-return-register'];

  return <ReportPage {...config} />;
}
