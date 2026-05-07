import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function GeneralLedgerSummary() {
  const config = REPORT_CONFIG['accounting/general-ledger-summary'];

  return <ReportPage {...config} />;
}
