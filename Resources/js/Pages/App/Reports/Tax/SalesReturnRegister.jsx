import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesReturnRegister() {
  const config = REPORT_CONFIG['tax/sales-return-register'];

  return <ReportPage {...config} />;
}
