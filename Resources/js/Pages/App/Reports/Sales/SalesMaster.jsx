import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesMaster() {
  const config = REPORT_CONFIG['sales/sales-master'];

  return <ReportPage {...config} />;
}
