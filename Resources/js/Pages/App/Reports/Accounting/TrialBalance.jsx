import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function TrialBalance() {
  const config = REPORT_CONFIG['accounting/trial-balance'];

  return <ReportPage {...config} />;
}
