import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function AbsentReport() {
  const config = REPORT_CONFIG['hr/absent-report'];

  return <ReportPage {...config} />;
}
