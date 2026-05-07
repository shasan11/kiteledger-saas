import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesByCustomer() {
  const config = REPORT_CONFIG['sales/sales-by-customer'];

  return <ReportPage {...config} />;
}
