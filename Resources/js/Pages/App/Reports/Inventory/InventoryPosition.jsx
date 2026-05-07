import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InventoryPosition() {
  const config = REPORT_CONFIG['inventory/inventory-position'];

  return <ReportPage {...config} />;
}
