import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ProductionVariance() {
  const config = REPORT_CONFIG['production/production-variance'];

  return <ReportPage {...config} />;
}
