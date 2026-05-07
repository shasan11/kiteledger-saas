import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesByItem() {
  const config = REPORT_CONFIG['sales/sales-by-item'];

  return <ReportPage {...config} />;
}
