import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function RatioAnalysis() {
  const config = REPORT_CONFIG['analytics/ratio-analysis'];

  return <ReportPage {...config} />;
}
