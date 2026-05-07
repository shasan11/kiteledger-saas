import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function SalesByItemMonthly() {
  const config = REPORT_CONFIG['sales/sales-by-item-monthly'];

  return <ReportPage {...config} />;
}
