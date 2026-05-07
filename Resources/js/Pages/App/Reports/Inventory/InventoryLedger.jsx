import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function InventoryLedger() {
  const config = REPORT_CONFIG['inventory/inventory-ledger'];

  return <ReportPage {...config} />;
}
