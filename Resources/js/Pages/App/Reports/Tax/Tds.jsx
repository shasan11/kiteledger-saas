import ReportPage from '../Shared/ReportPage';
import { REPORT_CONFIG } from '../reportRegistry';

export default function Tds() {
  const config = REPORT_CONFIG['tax/tds'];

  return <ReportPage {...config} />;
}
