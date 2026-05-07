import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function ProductionPlanning() {
  const config = REPORT_CONFIG['production/production-planning'];

  return <ReportPage {...config} />;
}
