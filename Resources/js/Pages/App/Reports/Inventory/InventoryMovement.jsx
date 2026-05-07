import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InventoryMovement() {
  const config = REPORT_CONFIG['inventory/inventory-movement'];

  return <ReportPage {...config} />;
}
