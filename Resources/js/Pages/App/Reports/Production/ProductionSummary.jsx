import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ProductionSummary() {
  const config = REPORT_CONFIG['production/production-summary'];

  return <ReportPage {...config} />;
}
