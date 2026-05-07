import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesByCustomerMonthly() {
  const config = REPORT_CONFIG['sales/sales-by-customer-monthly'];

  return <ReportPage {...config} />;
}
