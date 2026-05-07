import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function GlMaster() {
  const config = REPORT_CONFIG['accounting/gl-master'];

  return <ReportPage {...config} />;
}
