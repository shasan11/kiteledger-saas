import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InventoryMaster() {
  const config = REPORT_CONFIG['inventory/inventory-master'];

  return <ReportPage {...config} />;
}
