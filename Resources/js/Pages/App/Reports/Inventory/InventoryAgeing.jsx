import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InventoryAgeing() {
  const config = REPORT_CONFIG['inventory/inventory-ageing'];

  return <ReportPage {...config} />;
}
