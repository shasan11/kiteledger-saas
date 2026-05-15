import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function WarehouseWiseStock() {
  const config = REPORT_CONFIG['inventory/warehouse-wise-stock'];

  return <ReportPage {...config} />;
}
