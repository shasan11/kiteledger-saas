import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function PurchaseBySupplierMonthly() {
  const config = REPORT_CONFIG['purchase/purchase-by-supplier-monthly'];

  return <ReportPage {...config} />;
}
