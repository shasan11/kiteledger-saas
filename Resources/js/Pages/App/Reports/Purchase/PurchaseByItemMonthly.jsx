import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseByItemMonthly() {
  const config = REPORT_CONFIG['purchase/purchase-by-item-monthly'];

  return <ReportPage {...config} />;
}
