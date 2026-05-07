import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function BalanceSheet() {
  const config = REPORT_CONFIG['accounting/balance-sheet'];

  return <ReportPage {...config} />;
}
