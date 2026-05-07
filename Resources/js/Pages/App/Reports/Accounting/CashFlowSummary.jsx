import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function CashFlowSummary() {
  const config = REPORT_CONFIG['accounting/cash-flow-summary'];

  return <ReportPage {...config} />;
}
