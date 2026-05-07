import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function DetailGeneralLedger() {
  const config = REPORT_CONFIG['accounting/detail-general-ledger'];

  return <ReportPage {...config} />;
}
