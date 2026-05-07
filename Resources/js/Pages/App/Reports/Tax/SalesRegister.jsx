import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesRegister() {
  const config = REPORT_CONFIG['tax/sales-register'];

  return <ReportPage {...config} />;
}
